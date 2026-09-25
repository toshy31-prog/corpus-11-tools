use std::env;
use std::fmt::Write as _;
use std::io::{self, BufRead, Write};
use std::path::{Path, PathBuf};

use corpus_core::{
    Channel, Command, Direction, Layer, LayerFinding, ObservationQuery, Outcome, PathState, Pos,
    StructureKind, Terrain, WORLD_HEIGHT, WORLD_WIDTH, World, WorldModel, load_from_path,
    resource_symbol, save_to_path,
};

const DEFAULT_SAVE: &str = "corpus-monde.save";

fn main() {
    let args: Vec<String> = env::args().skip(1).collect();
    if args.iter().any(|arg| arg == "--serve") {
        run_server(&args);
        return;
    }
    if args.iter().any(|arg| arg == "--help" || arg == "-h") {
        print_help();
        return;
    }
    if args.iter().any(|arg| arg == "--machine") {
        run_machine(&args);
        return;
    }
    if args.iter().any(|arg| arg == "--demo") {
        run_demo();
        return;
    }

    let save_path =
        argument_value(&args, "--save").map_or_else(|| PathBuf::from(DEFAULT_SAVE), PathBuf::from);
    let mut world = if save_path.exists() {
        match load_from_path(&save_path) {
            Ok(world) => {
                println!("Monde repris depuis {}.", save_path.display());
                world
            }
            Err(error) => {
                eprintln!("Sauvegarde conservée sans modification : {error}");
                return;
            }
        }
    } else {
        World::new(1)
    };
    play(&mut world, &save_path);
}

fn play(world: &mut World, save_path: &Path) {
    let model = WorldModel::standard();
    let stdin = io::stdin();
    println!("CORPUS — Monde vivant\n");
    println!(
        "Un lieu persistant. Les passages, l’épuisement, les relations et l’entretien le changent réellement."
    );
    println!("Tape aide pour les commandes. La partie est sauvegardée après chaque geste.\n");

    loop {
        render(world, &model);
        print!("> ");
        if let Err(error) = io::stdout().flush() {
            eprintln!("Affichage interrompu : {error}");
            break;
        }
        let mut line = String::new();
        match stdin.read_line(&mut line) {
            Ok(0) => break,
            Ok(_) => {}
            Err(error) => {
                eprintln!("Lecture interrompue : {error}");
                break;
            }
        }
        let line = line.trim();
        if line.is_empty() {
            continue;
        }
        match parse_input(line) {
            Input::Command(command) => {
                let outcome = world.apply(command);
                show_outcome(&outcome);
                if let Err(error) = save_to_path(world, save_path) {
                    eprintln!("Sauvegarde non écrite : {error}");
                }
            }
            Input::Observe => observe_current(world, &model),
            Input::Traces => print_traces(world),
            Input::Help => print_help(),
            Input::Quit => {
                if let Err(error) = save_to_path(world, save_path) {
                    eprintln!("Sauvegarde finale non écrite : {error}");
                }
                println!("Monde conservé dans {}.", save_path.display());
                break;
            }
            Input::Invalid(message) => eprintln!("{message}"),
        }
    }
}

enum Input {
    Command(Command),
    Observe,
    Traces,
    Help,
    Quit,
    Invalid(String),
}

fn parse_input(line: &str) -> Input {
    let normalized = line.to_lowercase();
    let mut words = normalized.split_whitespace();
    let Some(first) = words.next() else {
        return Input::Invalid("Commande vide.".to_owned());
    };
    match first {
        "z" | "w" | "haut" | "nord" => Input::Command(Command::Move(Direction::Up)),
        "d" | "droite" | "est" => Input::Command(Command::Move(Direction::Right)),
        "s" | "bas" | "sud" => Input::Command(Command::Move(Direction::Down)),
        "q" | "a" | "gauche" | "ouest" => Input::Command(Command::Move(Direction::Left)),
        "e" | "agir" | "interagir" => Input::Command(Command::Interact),
        "observer" | "voir" | "o" => Input::Observe,
        "traces" | "histoire" => Input::Traces,
        "retour" => Input::Command(Command::ReturnToMarker),
        "attendre" => match words.next().unwrap_or("1").parse::<u32>() {
            Ok(steps) if (1..=10_000).contains(&steps) => Input::Command(Command::Wait(steps)),
            _ => Input::Invalid("Usage : attendre N, avec N entre 1 et 10000.".to_owned()),
        },
        "construire" | "build" => match words.next().and_then(parse_structure) {
            Some(kind) => Input::Command(Command::Build(kind)),
            None => {
                Input::Invalid("Usage : construire balise|foyer|atelier|pont|reprise.".to_owned())
            }
        },
        "aide" | "help" | "?" => Input::Help,
        "quitter" | "exit" => Input::Quit,
        _ => Input::Invalid(format!("Commande inconnue : {line}. Tape aide.")),
    }
}

fn parse_structure(value: &str) -> Option<StructureKind> {
    match value {
        "balise" => Some(StructureKind::Marker),
        "foyer" => Some(StructureKind::Hearth),
        "atelier" => Some(StructureKind::Workshop),
        "pont" => Some(StructureKind::Bridge),
        "reprise" => Some(StructureKind::Recovery),
        _ => None,
    }
}

fn render(world: &World, model: &WorldModel) {
    println!(
        "\ncycle {} | position {},{} | bois {} pierre {} fibres {} | commun {}/{}/{}{}",
        world.tick,
        world.player.x,
        world.player.y,
        world.inventory.wood,
        world.inventory.stone,
        world.inventory.fiber,
        world.commons.wood,
        world.commons.stone,
        world.commons.fiber,
        if world.assembly {
            " | assemblée active"
        } else {
            ""
        }
    );
    for y in 0..WORLD_HEIGHT {
        for x in 0..WORLD_WIDTH {
            let pos = Pos::new(x, y);
            print!("{}", cell_symbol(world, model, pos));
        }
        println!();
    }
    if let Some(trace) = world.traces.last() {
        println!("Dernière trace : {} — {}", trace.title, trace.detail);
    }
}

fn cell_symbol(world: &World, model: &WorldModel, pos: Pos) -> char {
    if world.player == pos {
        return '@';
    }
    let observation = model.observe(world, &ObservationQuery::player(pos));
    if matches!(
        observation.layers.get(&Layer::Terrain),
        Some(LayerFinding::Undetected)
    ) {
        return '?';
    }
    if let Some(resident) = world.residents.iter().find(|resident| resident.pos == pos) {
        return resident.name.chars().next().unwrap_or('p');
    }
    if let Some(structure) = world
        .structures
        .iter()
        .find(|structure| structure.pos == pos)
    {
        return if structure.active {
            match structure.kind {
                StructureKind::Marker => 'B',
                StructureKind::Hearth => 'F',
                StructureKind::Workshop => 'A',
                StructureKind::Bridge => '=',
                StructureKind::Recovery => 'R',
                StructureKind::Shelter => 'H',
                StructureKind::Fence => '|',
                StructureKind::Store => 'C',
            }
        } else {
            'x'
        };
    }
    if let Some(site) = world.resources.iter().find(|site| site.pos == pos) {
        return if site.exhausted {
            'x'
        } else if site.active {
            resource_symbol(site.kind)
        } else {
            ','
        };
    }
    match World::terrain_at(pos) {
        Terrain::Cliff => '#',
        Terrain::Water => '~',
        Terrain::Path => '=',
        Terrain::Grass => match world.path_state(pos) {
            PathState::Road => '+',
            PathState::Trail => ':',
            PathState::Wild | PathState::Inherited => '.',
        },
    }
}

fn observe_current(world: &World, model: &WorldModel) {
    let query = ObservationQuery {
        pos: world.player,
        observer: "player".to_owned(),
        channel: Channel::Sight,
    };
    println!(
        "Observation située en {},{} :",
        world.player.x, world.player.y
    );
    for (layer, finding) in model.observe(world, &query).layers {
        match finding {
            LayerFinding::Settled { value, sources } => {
                println!("- {layer:?} : {value} [{}]", sources.join(", "));
            }
            LayerFinding::Contested { candidates } => {
                println!("- {layer:?} : contesté");
                for candidate in candidates {
                    println!("  {} -> {}", candidate.provider, candidate.value);
                }
            }
            LayerFinding::Undetected => println!("- {layer:?} : non détectable d’ici"),
        }
    }
}

fn print_traces(world: &World) {
    for trace in world.traces.iter().rev().take(12).rev() {
        println!("t{:>4} | {} — {}", trace.tick, trace.title, trace.detail);
    }
}

fn show_outcome(outcome: &Outcome) {
    let label = match outcome {
        Outcome::Changed(_) => "Le monde change",
        Outcome::Blocked(_) => "Impossible ici",
        Outcome::Refused(_) => "Refus effectif",
        Outcome::Observed(_) => "Observation",
    };
    println!("{label} : {}", outcome.message());
}

fn print_help() {
    println!(
        "CORPUS — Monde vivant\n\
         \nCommandes :\n\
         z/q/s/d ou haut/gauche/bas/droite  se déplacer\n\
         e ou agir                            interagir à portée\n\
         observer                            voir les couches détectables ici\n\
         construire balise|foyer|atelier|pont|reprise\n\
         attendre N                          laisser le monde agir N cycles\n\
         retour                              rejoindre une balise active\n\
         traces                              lire les traces conservées\n\
         quitter                             sauvegarder et sortir\n\
         \nSymboles : @ toi, I/M/N habitants, w/s/f ressources, : sentier, + route, x capacité perdue."
    );
}

fn run_demo() {
    let mut world = World::new(1);
    for _ in 0..7 {
        let _ = world.apply(Command::Move(Direction::Up));
        let _ = world.apply(Command::Move(Direction::Down));
    }
    let _ = world.apply(Command::Wait(36));
    println!("{}", world.signature());
}

fn run_machine(args: &[String]) {
    let save_path =
        argument_value(args, "--save").map_or_else(|| PathBuf::from(DEFAULT_SAVE), PathBuf::from);
    let mut world = if save_path.exists() {
        match load_from_path(&save_path) {
            Ok(world) => world,
            Err(error) => {
                print_machine_error(&format!("Sauvegarde incompatible : {error}"));
                return;
            }
        }
    } else {
        World::new(1)
    };

    let outcome = match argument_value(args, "--command") {
        Some(code) => {
            let Some(command) = parse_machine_command(code) else {
                print_machine_error(&format!("Commande machine inconnue : {code}"));
                return;
            };
            Some(world.apply(command))
        }
        None => None,
    };
    if let Err(error) = save_to_path(&world, &save_path) {
        print_machine_error(&error.to_string());
        return;
    }
    println!("{}", world_json(&world, outcome.as_ref()));
}

fn run_server(args: &[String]) {
    let path =
        argument_value(args, "--save").map_or_else(|| PathBuf::from(DEFAULT_SAVE), PathBuf::from);
    // The OS releases this lock even after a crash. Never run two writers for one world.
    let lock = std::fs::OpenOptions::new()
        .create(true)
        .truncate(false)
        .write(true)
        .open(path.with_extension("save.lock"));
    let Ok(lock) = lock else {
        print_machine_error(
            "Impossible de verrouiller la sauvegarde. Vérifie les droits du dossier.",
        );
        return;
    };
    if lock.try_lock().is_err() {
        print_machine_error(
            "Ce monde est déjà ouvert dans une autre fenêtre. Ferme-la avant de le reprendre.",
        );
        return;
    }
    let mut world = if path.exists() {
        match load_from_path(&path) {
            Ok(world) => world,
            Err(error) => {
                print_machine_error(&error.to_string());
                return;
            }
        }
    } else {
        World::new(1)
    };
    let stdin = io::stdin();
    let mut stdout = io::stdout().lock();
    for line in stdin.lock().lines() {
        let Ok(line) = line else {
            break;
        };
        let code = line.trim();
        if code == "QUIT" {
            break;
        }
        let outcome = if code == "STATE" {
            None
        } else if let Some(command) = parse_machine_command(code) {
            Some(world.apply(command))
        } else {
            if writeln!(stdout, "{{\"ok\":false,\"error\":\"Commande inconnue\"}}")
                .and_then(|()| stdout.flush())
                .is_err()
            {
                break;
            }
            continue;
        };
        let payload = match save_to_path(&world, &path) {
            Ok(()) => render_json(&world, outcome.as_ref(), true),
            Err(error) => format!(
                "{{\"ok\":false,\"error\":\"{}\"}}",
                json_escape(&error.to_string())
            ),
        };
        if writeln!(stdout, "{payload}")
            .and_then(|()| stdout.flush())
            .is_err()
        {
            break;
        }
    }
    if let Err(error) = save_to_path(&world, &path) {
        eprintln!("{error}");
    }
}

fn parse_machine_command(code: &str) -> Option<Command> {
    let words: Vec<&str> = code.split_whitespace().collect();
    if let [action @ ("EXPLORE" | "USE" | "DISMANTLE" | "DEPOSIT"), x, y] = words.as_slice() {
        let pos = Pos::new(x.parse().ok()?, y.parse().ok()?);
        return Some(match *action {
            "EXPLORE" => Command::Explore(pos),
            "USE" => Command::UseAt(pos),
            "DISMANTLE" => Command::Dismantle(pos),
            _ => Command::Deposit(pos),
        });
    }
    if let ["PLACE", kind, x, y] = words.as_slice() {
        return Some(Command::Place(
            StructureKind::parse(kind)?,
            Pos::new(x.parse().ok()?, y.parse().ok()?),
        ));
    }
    match code {
        "UP" => Some(Command::Move(Direction::Up)),
        "RIGHT" => Some(Command::Move(Direction::Right)),
        "DOWN" => Some(Command::Move(Direction::Down)),
        "LEFT" => Some(Command::Move(Direction::Left)),
        "INTERACT" => Some(Command::Interact),
        "RETURN" => Some(Command::ReturnToMarker),
        "BUILD_MARKER" => Some(Command::Build(StructureKind::Marker)),
        "BUILD_HEARTH" => Some(Command::Build(StructureKind::Hearth)),
        "BUILD_WORKSHOP" => Some(Command::Build(StructureKind::Workshop)),
        "BUILD_BRIDGE" => Some(Command::Build(StructureKind::Bridge)),
        "BUILD_RECOVERY" => Some(Command::Build(StructureKind::Recovery)),
        _ => code
            .strip_prefix("WAIT_")
            .and_then(|steps| steps.parse::<u32>().ok())
            .filter(|steps| (1..=10_000).contains(steps))
            .map(Command::Wait),
    }
}

fn world_json(world: &World, outcome: Option<&Outcome>) -> String {
    render_json(world, outcome, false)
}

fn render_json(world: &World, outcome: Option<&Outcome>, scene: bool) -> String {
    let model = WorldModel::standard();
    let mut json = format!(
        "{{\"ok\":true,\"width\":{WORLD_WIDTH},\"height\":{WORLD_HEIGHT},\"tick\":{},\"player\":{{\"x\":{},\"y\":{}}},\"inventory\":{{\"wood\":{},\"stone\":{},\"fiber\":{}}},\"commons\":{{\"wood\":{},\"stone\":{},\"fiber\":{}}},\"assembly\":{},\"cells\":[",
        world.tick,
        world.player.x,
        world.player.y,
        world.inventory.wood,
        world.inventory.stone,
        world.inventory.fiber,
        world.commons.wood,
        world.commons.stone,
        world.commons.fiber,
        world.assembly
    );
    let mut first = true;
    for y in 0..WORLD_HEIGHT {
        for x in 0..WORLD_WIDTH {
            let pos = Pos::new(x, y);
            let observation = model.observe(world, &ObservationQuery::player(pos));
            let visible = !matches!(
                observation.layers.get(&Layer::Terrain),
                Some(LayerFinding::Undetected)
            );
            if !first {
                json.push(',');
            }
            first = false;
            let terrain = match World::terrain_at(pos) {
                Terrain::Grass => "grass",
                Terrain::Path => "path",
                Terrain::Water => "water",
                Terrain::Cliff => "cliff",
            };
            let path = match world.path_state(pos) {
                PathState::Wild => "wild",
                PathState::Trail => "trail",
                PathState::Road => "road",
                PathState::Inherited => "inherited",
            };
            write!(
                json,
                "{{\"x\":{x},\"y\":{y},\"visible\":{visible},\"terrain\":\"{terrain}\",\"path\":\"{path}\"}}"
            )
            .expect("écriture en mémoire");
        }
    }
    json.push_str("],\"resources\":[");
    append_resources(&mut json, world, &model, scene);
    json.push_str("],\"residents\":[");
    append_residents(&mut json, world, &model, scene);
    json.push_str("],\"structures\":[");
    append_structures(&mut json, world, &model, scene);
    json.push_str("],\"last_trace\":");
    if let Some(trace) = world.traces.last() {
        write!(
            json,
            "{{\"tick\":{},\"title\":\"{}\",\"detail\":\"{}\"}}",
            trace.tick,
            json_escape(&trace.title),
            json_escape(&trace.detail)
        )
        .expect("écriture en mémoire");
    } else {
        json.push_str("null");
    }
    json.push_str(",\"outcome\":");
    append_outcome(&mut json, outcome);
    json.push('}');
    json
}

fn append_resources(json: &mut String, world: &World, model: &WorldModel, scene: bool) {
    let mut first = true;
    for site in &world.resources {
        if !scene && !position_visible(world, model, site.pos, Layer::Ecology) {
            continue;
        }
        comma(json, &mut first);
        let state = if site.exhausted {
            "exhausted"
        } else if site.active {
            "active"
        } else {
            "recovering"
        };
        write!(
            json,
            "{{\"x\":{},\"y\":{},\"kind\":\"{}\",\"state\":\"{state}\",\"pressure\":{}}}",
            site.pos.x,
            site.pos.y,
            site.kind.label(),
            site.pressure
        )
        .expect("écriture en mémoire");
    }
}

fn append_residents(json: &mut String, world: &World, model: &WorldModel, scene: bool) {
    let mut first = true;
    for resident in &world.residents {
        if !scene && !position_visible(world, model, resident.pos, Layer::Actors) {
            continue;
        }
        comma(json, &mut first);
        write!(
            json,
            "{{\"x\":{},\"y\":{},\"name\":\"{}\",\"relation\":{},\"helped\":{},\"displaced\":{}}}",
            resident.pos.x,
            resident.pos.y,
            json_escape(&resident.name),
            resident.relation,
            resident.helped,
            resident.displaced
        )
        .expect("écriture en mémoire");
    }
}

fn append_structures(json: &mut String, world: &World, model: &WorldModel, scene: bool) {
    let mut first = true;
    for structure in &world.structures {
        if !scene && !position_visible(world, model, structure.pos, Layer::Institutions) {
            continue;
        }
        comma(json, &mut first);
        write!(
            json,
            "{{\"x\":{},\"y\":{},\"kind\":\"{}\",\"active\":{},\"condition\":{}}}",
            structure.pos.x,
            structure.pos.y,
            structure.kind.code(),
            structure.active,
            structure.condition
        )
        .expect("écriture en mémoire");
    }
}

fn append_outcome(json: &mut String, outcome: Option<&Outcome>) {
    let Some(outcome) = outcome else {
        json.push_str("null");
        return;
    };
    let kind = match outcome {
        Outcome::Changed(_) => "changed",
        Outcome::Blocked(_) => "blocked",
        Outcome::Refused(_) => "refused",
        Outcome::Observed(_) => "observed",
    };
    write!(
        json,
        "{{\"kind\":\"{kind}\",\"message\":\"{}\"}}",
        json_escape(outcome.message())
    )
    .expect("écriture en mémoire");
}

fn position_visible(world: &World, model: &WorldModel, pos: Pos, layer: Layer) -> bool {
    !matches!(
        model
            .observe(world, &ObservationQuery::player(pos))
            .layers
            .get(&layer),
        Some(LayerFinding::Undetected)
    )
}

fn comma(json: &mut String, first: &mut bool) {
    if !*first {
        json.push(',');
    }
    *first = false;
}

fn json_escape(value: &str) -> String {
    value
        .chars()
        .flat_map(|character| match character {
            '\\' => "\\\\".chars().collect::<Vec<_>>(),
            '"' => "\\\"".chars().collect(),
            '\n' => "\\n".chars().collect(),
            '\r' => "\\r".chars().collect(),
            '\t' => "\\t".chars().collect(),
            other => vec![other],
        })
        .collect()
}

fn print_machine_error(message: &str) {
    println!("{{\"ok\":false,\"error\":\"{}\"}}", json_escape(message));
}

fn argument_value<'a>(args: &'a [String], name: &str) -> Option<&'a str> {
    args.windows(2)
        .find(|pair| pair[0] == name)
        .map(|pair| pair[1].as_str())
}
