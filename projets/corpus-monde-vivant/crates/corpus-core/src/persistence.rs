use std::fmt::{Display, Formatter};
use std::fs;
use std::path::Path;

use crate::model::{BASE_VERSION, Command, Direction, STATE_VERSION, StructureKind, World};

const MAGIC: &str = "CORPUS-WORLD";

#[derive(Debug)]
pub struct SaveError(String);

impl Display for SaveError {
    fn fmt(&self, formatter: &mut Formatter<'_>) -> std::fmt::Result {
        formatter.write_str(&self.0)
    }
}

impl std::error::Error for SaveError {}

#[must_use]
pub fn encode(world: &World) -> String {
    let mut lines = vec![
        format!("{MAGIC} {STATE_VERSION}"),
        format!("BASE {}", world.base_version),
        format!("SEED {}", world.seed),
    ];
    lines.extend(world.deltas.iter().map(encode_command));
    lines.push(String::new());
    lines.join("\n")
}

/// Reconstruit un monde en rejouant une sauvegarde textuelle.
///
/// # Errors
///
/// Échoue si l’en-tête, la version, la graine ou une commande est invalide.
pub fn decode(contents: &str) -> Result<World, SaveError> {
    let mut lines = contents.lines();
    let header = lines
        .next()
        .ok_or_else(|| SaveError("Sauvegarde vide.".to_owned()))?;
    if header != format!("{MAGIC} {STATE_VERSION}") && header != format!("{MAGIC} 1") {
        return Err(SaveError(format!(
            "Version de sauvegarde non prise en charge : {header}"
        )));
    }
    let base = lines
        .next()
        .and_then(|line| line.strip_prefix("BASE "))
        .ok_or_else(|| SaveError("Version du monde de base absente.".to_owned()))?;
    if base != BASE_VERSION {
        return Err(SaveError(format!(
            "Monde de base incompatible : {base}; attendu : {BASE_VERSION}."
        )));
    }
    let seed = lines
        .next()
        .and_then(|line| line.strip_prefix("SEED "))
        .ok_or_else(|| SaveError("Graine absente.".to_owned()))?
        .parse::<u64>()
        .map_err(|error| SaveError(format!("Graine invalide : {error}")))?;
    let commands = lines
        .filter(|line| !line.trim().is_empty())
        .map(decode_command)
        .collect::<Result<Vec<_>, _>>()?;
    Ok(World::replay(seed, &commands))
}

/// Écrit une sauvegarde textuelle rejouable.
///
/// # Errors
///
/// Échoue si le fichier ne peut pas être créé ou écrit.
pub fn save_to_path(world: &World, path: &Path) -> Result<(), SaveError> {
    let pending = path.with_extension("save.pending");
    fs::write(&pending, encode(world))
        .and_then(|()| fs::rename(&pending, path))
        .map_err(|error| {
            SaveError(format!(
                "Écriture de {} impossible : {error}",
                path.display()
            ))
        })
}

/// Charge puis rejoue une sauvegarde textuelle.
///
/// # Errors
///
/// Échoue si le fichier est illisible ou si son contenu est incompatible.
pub fn load_from_path(path: &Path) -> Result<World, SaveError> {
    let contents = fs::read_to_string(path).map_err(|error| {
        SaveError(format!(
            "Lecture de {} impossible : {error}",
            path.display()
        ))
    })?;
    decode(&contents)
}

fn encode_command(command: &Command) -> String {
    match command {
        Command::Move(direction) => format!("MOVE {}", direction.code()),
        Command::Interact => "INTERACT".to_owned(),
        Command::Build(kind) => format!("BUILD {}", kind.code()),
        Command::Wait(steps) => format!("WAIT {steps}"),
        Command::ReturnToMarker => "RETURN".to_owned(),
        Command::Explore(pos) => format!("EXPLORE {} {}", pos.x, pos.y),
        Command::UseAt(pos) => format!("USE {} {}", pos.x, pos.y),
        Command::Place(kind, pos) => format!("PLACE {} {} {}", kind.code(), pos.x, pos.y),
        Command::Dismantle(pos) => format!("DISMANTLE {} {}", pos.x, pos.y),
        Command::Deposit(pos) => format!("DEPOSIT {} {}", pos.x, pos.y),
    }
}

fn decode_command(line: &str) -> Result<Command, SaveError> {
    let words: Vec<&str> = line.split_whitespace().collect();
    if let [action @ ("EXPLORE" | "USE" | "DISMANTLE" | "DEPOSIT"), x, y] = words.as_slice() {
        let pos = crate::model::Pos::new(
            x.parse()
                .map_err(|_| SaveError("Position invalide".to_owned()))?,
            y.parse()
                .map_err(|_| SaveError("Position invalide".to_owned()))?,
        );
        return Ok(match *action {
            "EXPLORE" => Command::Explore(pos),
            "USE" => Command::UseAt(pos),
            "DISMANTLE" => Command::Dismantle(pos),
            _ => Command::Deposit(pos),
        });
    }
    if let ["PLACE", kind, x, y] = words.as_slice() {
        let kind =
            StructureKind::parse(kind).ok_or_else(|| SaveError("Ouvrage inconnu".to_owned()))?;
        let pos = crate::model::Pos::new(
            x.parse()
                .map_err(|_| SaveError("Position invalide".to_owned()))?,
            y.parse()
                .map_err(|_| SaveError("Position invalide".to_owned()))?,
        );
        return Ok(Command::Place(kind, pos));
    }
    let mut parts = line.split_whitespace();
    match (parts.next(), parts.next(), parts.next()) {
        (Some("MOVE"), Some(code), None) => Direction::parse(code)
            .map(Command::Move)
            .ok_or_else(|| SaveError(format!("Direction inconnue : {line}"))),
        (Some("INTERACT"), None, None) => Ok(Command::Interact),
        (Some("BUILD"), Some(code), None) => StructureKind::parse(code)
            .map(Command::Build)
            .ok_or_else(|| SaveError(format!("Construction inconnue : {line}"))),
        (Some("WAIT"), Some(steps), None) => steps
            .parse::<u32>()
            .map(Command::Wait)
            .map_err(|error| SaveError(format!("Durée invalide dans {line} : {error}"))),
        (Some("RETURN"), None, None) => Ok(Command::ReturnToMarker),
        _ => Err(SaveError(format!(
            "Commande de sauvegarde invalide : {line}"
        ))),
    }
}
