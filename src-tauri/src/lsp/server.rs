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
use log::{debug, info};
use tokio::{sync::RwLock, task::JoinHandle};
use tower::ServiceBuilder;

use crate::copilot::request::FeatureFlagsNotification;

struct ClientState {
    indexed_tx: Option<oneshot::Sender<()>>,
}

struct Stop;

#[derive(Clone)]
pub struct LspServer {
    server: Arc<RwLock<ServerSocket>>,
}

impl LspServer {
    pub fn new(script: &str) -> (LspServer, JoinHandle<()>) {
        let (mainloop, server) = async_lsp::MainLoop::new_client(|_server| {
            let mut router = Router::new(ClientState {
                indexed_tx: None,
            });
            router
                .notification::<Progress>(|this, prog| {
                    info!("{:?} {:?}", prog.token, prog.value);
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
                })
                .notification::<LogMessage>(|_, _| ControlFlow::Continue(()))
                .notification::<FeatureFlagsNotification>(|_, _| ControlFlow::Continue(()))
                .notification::<PublishDiagnostics>(|_, _| ControlFlow::Continue(()))
                .notification::<ShowMessage>(|_, params| {
                    info!("Message {:?}: {}", params.typ, params.message);
                    ControlFlow::Continue(())
                })
                .unhandled_notification(|_, _| ControlFlow::Continue(()))
                .event(|_, _: Stop| ControlFlow::Break(Ok(())));

            ServiceBuilder::new()
                .layer(TracingLayer::default())
                .layer(CatchUnwindLayer::default())
                .layer(ConcurrencyLayer::default())
                .service(router)
        });

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
