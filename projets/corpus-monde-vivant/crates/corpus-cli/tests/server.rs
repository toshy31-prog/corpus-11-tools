use std::io::{BufRead, BufReader, Write};
use std::path::PathBuf;
use std::process::{Child, ChildStdin, ChildStdout, Command, Stdio};
use std::time::{SystemTime, UNIX_EPOCH};

struct Server {
    child: Child,
    input: ChildStdin,
    output: BufReader<ChildStdout>,
}

impl Server {
    fn open(path: &PathBuf) -> Self {
        let mut child = Command::new(env!("CARGO_BIN_EXE_corpus-cli"))
            .args(["--serve", "--save"])
            .arg(path)
            .stdin(Stdio::piped())
            .stdout(Stdio::piped())
            .spawn()
            .unwrap();
        Self {
            input: child.stdin.take().unwrap(),
            output: BufReader::new(child.stdout.take().unwrap()),
            child,
        }
    }
    fn request(&mut self, text: &str) -> String {
        writeln!(self.input, "{text}").unwrap();
        self.input.flush().unwrap();
        let mut line = String::new();
        self.output.read_line(&mut line).unwrap();
        line
    }
    fn close(&mut self) {
        writeln!(self.input, "QUIT").unwrap();
        self.input.flush().unwrap();
        assert!(self.child.wait().unwrap().success());
    }
}

fn save_path(name: &str) -> PathBuf {
    let nonce = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap()
        .as_nanos();
    std::env::temp_dir().join(format!(
        "corpus-test-{name}-{}-{nonce}.save",
        std::process::id()
    ))
}

#[test]
fn persistent_process_saves_actions_and_reloads_same_state() {
    let path = save_path("replay");
    let mut server = Server::open(&path);
    let pid = server.child.id();
    assert!(server.request("STATE").contains("\"tick\":0"));
    assert!(server.request("USE 5 5").contains("\"wood\":1"));
    assert!(
        server
            .request("PLACE FENCE 4 4")
            .contains("\"kind\":\"FENCE\"")
    );
    assert!(server.request("WAIT_9").contains("\"tick\":11"));
    let last = server.request("STATE");
    assert_eq!(pid, server.child.id());
    server.close();
    let mut resumed = Server::open(&path);
    assert_eq!(last, resumed.request("STATE"));
    resumed.close();
    std::fs::remove_file(path.with_extension("save.lock")).unwrap();
    std::fs::remove_file(path).unwrap();
}

#[test]
fn second_writer_is_refused_and_invalid_command_does_not_destroy_state() {
    let path = save_path("locking");
    let mut first = Server::open(&path);
    let initial = first.request("STATE");
    let output = Command::new(env!("CARGO_BIN_EXE_corpus-cli"))
        .args(["--serve", "--save"])
        .arg(&path)
        .output()
        .unwrap();
    assert!(
        String::from_utf8(output.stdout)
            .unwrap()
            .contains("déjà ouvert")
    );
    assert!(first.request("NOT_A_COMMAND").contains("\"ok\":false"));
    assert_eq!(initial, first.request("STATE"));
    first.close();
    std::fs::remove_file(path.with_extension("save.lock")).unwrap();
    std::fs::remove_file(path).unwrap();
}

#[test]
fn unreadable_save_is_never_replaced_by_a_new_world() {
    let path = save_path("corrupt");
    let corrupt = "THIS IS NOT A WORLD";
    std::fs::write(&path, corrupt).unwrap();
    for mode in ["--serve", "--machine"] {
        let output = Command::new(env!("CARGO_BIN_EXE_corpus-cli"))
            .args([mode, "--save"])
            .arg(&path)
            .output()
            .unwrap();
        assert!(
            String::from_utf8(output.stdout)
                .unwrap()
                .contains("\"ok\":false")
        );
        assert_eq!(std::fs::read_to_string(&path).unwrap(), corrupt);
    }
    std::fs::remove_file(path.with_extension("save.lock")).unwrap();
    std::fs::remove_file(path).unwrap();
}
