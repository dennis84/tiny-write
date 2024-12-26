use std::sync::Arc;
use std::time::SystemTime;
use std::{fs::File, path::PathBuf, time::Duration};

use anyhow::{anyhow, Result};
use dirs::home_dir;
use futures::io::AsyncBufReadExt;
use futures::{StreamExt, TryStreamExt};
use log::debug;
use reqwest::Client;
use serde::{Deserialize, Serialize};
use serde_json::Value;
use strum::EnumIter;
use tauri::ipc::Channel;
use tokio::sync::RwLock;

#[derive(Clone, Copy, Serialize, Deserialize, Debug, Eq, PartialEq)]
#[serde(rename_all = "lowercase")]
pub enum Role {
    User,
    Assistant,
    System,
}

#[derive(Clone, Debug, Default, Serialize, Deserialize, PartialEq, EnumIter)]
pub enum Model {
    #[default]
    #[serde(alias = "gpt-4o", rename = "gpt-4o-2024-05-13")]
    Gpt4o,
    #[serde(alias = "gpt-4", rename = "gpt-4")]
    Gpt4,
    #[serde(alias = "gpt-3.5-turbo", rename = "gpt-3.5-turbo")]
    Gpt3_5Turbo,
    #[serde(alias = "o1-preview", rename = "o1-preview-2024-09-12")]
    O1Preview,
    #[serde(alias = "o1-mini", rename = "o1-mini-2024-09-12")]
    O1Mini,
    #[serde(alias = "claude-3-5-sonnet", rename = "claude-3.5-sonnet")]
    Claude3_5Sonnet,
}

impl Model {
    pub fn uses_streaming(&self) -> bool {
        match self {
            Self::Gpt4o | Self::Gpt4 | Self::Gpt3_5Turbo | Self::Claude3_5Sonnet => true,
            Self::O1Mini | Self::O1Preview => false,
        }
    }
}

#[derive(Serialize, Deserialize, Debug, Eq, PartialEq)]
pub struct ChatMessage {
    pub role: Role,
    pub content: String,
}

#[derive(Serialize, Deserialize, Debug)]
pub struct Request {
    pub intent: bool,
    pub n: usize,
    pub stream: bool,
    pub temperature: f32,
    pub model: Model,
    pub messages: Vec<ChatMessage>,
}

impl Request {
    pub fn new(model: Model, messages: Vec<ChatMessage>) -> Self {
        Self {
            intent: true,
            n: 1,
            stream: model.uses_streaming(),
            temperature: 0.1,
            model,
            messages,
        }
    }
}

#[derive(Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateThreadResponse {
    thread_id: String,
}

#[derive(Deserialize, Clone)]
struct ApiTokenEndpoints {
    api: String,
}

#[derive(Deserialize, Clone)]
struct ApiTokenResponse {
    token: String,
    expires_at: u64,
    endpoints: ApiTokenEndpoints,
}

pub struct CopilotChatService {
    token: Arc<RwLock<Option<ApiTokenResponse>>>,
    client: Client,
}

impl CopilotChatService {
    pub fn new() -> Result<Self> {
        let client = reqwest::ClientBuilder::new()
            .connect_timeout(Duration::from_millis(2000))
            .build()?;
        Ok(Self {
            token: Arc::new(RwLock::new(None)),
            client,
        })
    }

    pub async fn send(
        &self,
        model: Model,
        messages: Vec<ChatMessage>,
        on_event: Channel<String>,
    ) -> Result<()> {
        let request = Request::new(model, messages);
        let body = serde_json::to_string(&request)?;

        let token_response = self.get_api_token().await?;
        let url = format!("{}/chat/completions", token_response.endpoints.api);

        debug!(
            "Copilot chat - (url={}, token={}, body={})",
            url, token_response.token, body
        );
        let response = self
            .client
            .post(url)
            .header("Content-Type", "application/json")
            .header("Authorization", format!("Bearer {}", token_response.token))
            .header("Editor-Version", Self::app_version())
            .header("Copilot-Integration-Id", "vscode-chat")
            .body(body)
            .send()
            .await?;

        if !response.status().is_success() {
            return Err(anyhow!(
                "Failed to connect to API: {} {}",
                response.status(),
                response.text().await?
            ));
        }

        if request.stream {
            let mut stream = response
                .bytes_stream()
                .map_err(|e| std::io::Error::new(std::io::ErrorKind::Other, e))
                .into_async_read()
                .lines();

            while let Some(Ok(line)) = stream.next().await {
                if let Some(data) = line.strip_prefix("data: ") {
                    debug!("send data {}", data);
                    on_event.send(data.to_string())?;
                }
            }
        }

        Ok(())
    }

    async fn get_api_token(&self) -> Result<ApiTokenResponse> {
        let maybe_token = self.token.read().await;

        if let Some(token) = &*maybe_token {
            let now = SystemTime::now();
            let dur = now.duration_since(SystemTime::UNIX_EPOCH)?;
            if token.expires_at > dur.as_secs() {
                debug!("Use cached GitHub api token {}", token.token);
                return Ok(token.clone());
            }
        }

        drop(maybe_token);

        let response = self
            .client
            .get("https://api.github.com/copilot_internal/v2/token")
            .header(
                "Authorization",
                format!("Bearer {}", Self::get_auth_token()?),
            )
            .header("Accept", "application/json")
            .header("User-Agent", Self::app_version())
            .send()
            .await?
            .json::<ApiTokenResponse>()
            .await?;
        debug!("GitHub api token {}", response.token);

        let mut token = self.token.write().await;
        *token = Some(response.clone());
        Ok(response)
    }

    fn get_auth_token() -> Result<String> {
        let path = Self::get_copilot_config_path().unwrap();
        let file = File::open(path)?;
        let json: Value = serde_json::from_reader(file)?;
        for (key, value) in json.as_object().unwrap() {
            if key.starts_with("github.com") {
                let token = value.get("oauth_token").unwrap().as_str().unwrap();
                return Ok(token.to_string());
            }
        }

        Err(anyhow!("No oauth_token found"))
    }

    fn get_copilot_config_path() -> Option<PathBuf> {
        Some(
            home_dir()?
                .join(".config")
                .join("github-copilot")
                .join("apps.json"),
        )
    }

    fn app_version() -> String {
        "TinyWrite/0.8.0".to_string()
    }
}
