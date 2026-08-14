use std::{ops::ControlFlow, process::Stdio, sync::Arc};

use async_lsp::{
    concurrency::ConcurrencyLayer,
    lsp_types::{
        notification::{LogMessage, Notification, Progress, PublishDiagnostics, ShowMessage},
        request::{Initialize, Request},
        InitializeResult, InitializedParams, NumberOrString, ProgressParamsValue, WorkDoneProgress,
    },
    panic::CatchUnwindLayer,
    router::Router,
    tracing::TracingLayer,
    LanguageServer, Result, ServerSocket,
};
use futures_channel::oneshot;
use serde::Serialize;
use serde_json::{json, Value};
use tauri::{AppHandle, Emitter, Runtime};
use tokio::{sync::RwLock, task::JoinHandle};
use tower::ServiceBuilder;
use tracing::{debug, info, warn};

use crate::copilot::request::FeatureFlagsNotification;

const NOTIFICATION_EVENT: &str = "lsp://notification";

/// Emits a generic frontend event for every LSP notification received from a
/// language server, so the UI can observe/log them without each notification
/// type needing its own plumbing.
fn emit_notification<R: Runtime>(app_handle: &AppHandle<R>, method: &str, params: impl Serialize) {
    let params = serde_json::to_value(params).unwrap_or(Value::Null);
    if let Err(err) = app_handle.emit(
        NOTIFICATION_EVENT,
        json!({ "method": method, "params": params }),
    ) {
        warn!("failed to emit lsp notification (method={method}): {err:?}");
    }
}

struct ClientState {
    indexed_tx: Option<oneshot::Sender<()>>,
}

struct Stop;

#[derive(Clone)]
pub struct LspServer {
    pub plugin_name: String,
    server: Arc<RwLock<ServerSocket>>,
}

impl LspServer {
    pub fn new<R: Runtime>(
        plugin_name: String,
        script: &str,
        app_handle: &AppHandle<R>,
    ) -> (LspServer, JoinHandle<()>) {
        let (mainloop, server) = {
            let app_handle = app_handle.clone();
            async_lsp::MainLoop::new_client(move |_server| {
                let mut router = Router::new(ClientState { indexed_tx: None });
                router
                    .notification::<Progress>({
                        let app_handle = app_handle.clone();
                        move |this, prog| {
                            emit_notification(&app_handle, Progress::METHOD, &prog);
                            if matches!(prog.token, NumberOrString::String(s) if s == "rustAnalyzer/Indexing")
                                && matches!(
                                    prog.value,
                                    ProgressParamsValue::WorkDone(WorkDoneProgress::End(_))
                                )
                            {
                                // Sometimes rust-analyzer auto-index multiple times?
                                if let Some(tx) = this.indexed_tx.take() {
                                    let _: Result<_, _> = tx.send(());
                                }
                            }
                            ControlFlow::Continue(())
                        }
                    })
                    .notification::<LogMessage>({
                        let app_handle = app_handle.clone();
                        move |_, params| {
                            emit_notification(&app_handle, LogMessage::METHOD, &params);
                            ControlFlow::Continue(())
                        }
                    })
                    .notification::<FeatureFlagsNotification>({
                        let app_handle = app_handle.clone();
                        move |_, params| {
                            emit_notification(&app_handle, FeatureFlagsNotification::METHOD, &params);
                            ControlFlow::Continue(())
                        }
                    })
                    .notification::<PublishDiagnostics>({
                        let app_handle = app_handle.clone();
                        move |_, params| {
                            emit_notification(&app_handle, PublishDiagnostics::METHOD, &params);
                            ControlFlow::Continue(())
                        }
                    })
                    .notification::<ShowMessage>({
                        let app_handle = app_handle.clone();
                        move |_, params| {
                            info!("Message {:?}: {}", params.typ, params.message);
                            emit_notification(&app_handle, ShowMessage::METHOD, &params);
                            ControlFlow::Continue(())
                        }
                    })
                    .unhandled_notification({
                        let app_handle = app_handle.clone();
                        move |_, notif| {
                            emit_notification(&app_handle, &notif.method, &notif.params);
                            ControlFlow::Continue(())
                        }
                    })
                    .event(|_, _: Stop| ControlFlow::Break(Ok(())));

                ServiceBuilder::new()
                    .layer(TracingLayer::default())
                    .layer(CatchUnwindLayer::default())
                    .layer(ConcurrencyLayer::default())
                    .service(router)
            })
        };

        let child = async_process::Command::new("sh")
            .args(["-c", script])
            .stdin(Stdio::piped())
            .stdout(Stdio::piped())
            .stderr(Stdio::inherit())
            .spawn()
            .unwrap();
        let stdout = child.stdout.unwrap();
        let stdin = child.stdin.unwrap();

        let mainloop_fut = tokio::spawn(async move {
            mainloop.run_buffered(stdout, stdin).await.unwrap();
        });

        (
            LspServer {
                plugin_name,
                server: Arc::new(RwLock::new(server)),
            },
            mainloop_fut,
        )
    }

    pub async fn request<R: Request>(&self, params: R::Params) -> Result<R::Result> {
        self.server.read().await.request::<R>(params).await
    }

    pub async fn notify<N: Notification>(&self, params: N::Params) -> Result<()> {
        self.server.read().await.notify::<N>(params)
    }

    pub async fn initialize(
        &self,
        params: <Initialize as Request>::Params,
    ) -> Result<InitializeResult> {
        self.server.write().await.initialize(params).await
    }

    pub async fn initialized(&self) -> Result<()> {
        self.server.write().await.initialized(InitializedParams {})
    }

    pub async fn shutdown(&self) -> Result<()> {
        debug!("shutdown lsp server");
        let mut server = self.server.write().await;
        server.shutdown(()).await?;
        server.exit(())?;
        server.emit(Stop)?;
        Ok(())
    }
}
