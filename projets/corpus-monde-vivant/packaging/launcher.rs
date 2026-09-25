use std::os::unix::process::CommandExt;
use std::process::Command;

fn main() {
    let executable = std::env::current_exe().expect("Chemin du jeu indisponible");
    let folder = executable.parent().expect("Dossier du jeu indisponible");
    let args: Vec<_> = std::env::args_os().skip(1).collect();
    let split = args.iter().position(|arg| arg == "--").unwrap_or(args.len());
    let mut command = Command::new(folder.join("runtime/Godot"));
    command.arg("--path").arg(folder.join("game"));
    command.args(&args[..split]);
    command.arg("--").arg("--core").arg(folder.join("CORPUS-Core"));
    if split < args.len() { command.args(&args[split + 1..]); }
    let error = command.exec();
    eprintln!("Impossible de lancer CORPUS : {error}");
    std::process::exit(1);
}
