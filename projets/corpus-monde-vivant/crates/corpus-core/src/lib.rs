pub mod model;
pub mod persistence;
pub mod providers;
mod simulation;

pub use model::{
    Command, Direction, Inventory, Outcome, PathState, Pos, ResourceKind, StructureKind, Terrain,
    WORLD_HEIGHT, WORLD_WIDTH, World,
};
pub use persistence::{SaveError, decode, encode, load_from_path, save_to_path};
pub use providers::{
    Candidate, Channel, EvidenceKind, Layer, LayerFinding, Observation, ObservationQuery, Provider,
    WorldModel, resource_symbol,
};

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn continuous_exploration_cannot_teleport_or_advance_time() {
        let mut world = World::new(1);
        assert!(matches!(
            world.apply(Command::Explore(Pos::new(6, 5))),
            Outcome::Blocked(_)
        ));
        assert_eq!(world.player, Pos::new(4, 5));
        world.apply(Command::Explore(Pos::new(4, 4)));
        assert_eq!(world.player, Pos::new(4, 4));
        assert_eq!(world.tick, 0);
        assert!(matches!(
            world.apply(Command::Explore(Pos::new(4, 3))),
            Outcome::Blocked(_)
        ));
    }

    #[test]
    fn a_bridge_opens_a_real_water_crossing_and_dismantling_closes_it() {
        let mut world = World::new(2);
        world.inventory.wood = 2;
        world.inventory.stone = 1;
        world.apply(Command::Explore(Pos::new(4, 4)));
        let water = Pos::new(4, 3);
        assert_eq!(world.travel_cost(water), None);
        assert!(matches!(
            world.apply(Command::Place(StructureKind::Bridge, water)),
            Outcome::Changed(_)
        ));
        assert!(world.travel_cost(water).is_some());
        world.apply(Command::Explore(water));
        assert_eq!(world.player, water);
        world.apply(Command::Explore(Pos::new(4, 4)));
        world.apply(Command::Dismantle(water));
        assert_eq!(world.travel_cost(water), None);
        assert_eq!(world.inventory.wood, 1);
        assert!(!world.traces.is_empty());
    }

    #[test]
    fn a_fence_redirects_residents_and_blocks_the_player_until_removed() {
        let mut baseline = World::new(3);
        baseline.player = Pos::new(5, 7);
        baseline.residents[0].pos = Pos::new(5, 8);
        baseline.residents[0].route = vec![Pos::new(5, 8), Pos::new(7, 8)];
        let mut closed = baseline.clone();
        closed.inventory.wood = 1;
        let fence = Pos::new(6, 8);
        closed.apply(Command::Place(StructureKind::Fence, fence));
        baseline.apply(Command::Wait(3));
        closed.apply(Command::Wait(2));
        assert_eq!(baseline.residents[0].pos, fence);
        assert_ne!(closed.residents[0].pos, fence);
        closed.apply(Command::Explore(Pos::new(5, 8)));
        assert!(matches!(
            closed.apply(Command::Explore(fence)),
            Outcome::Blocked(_)
        ));
        closed.apply(Command::Dismantle(fence));
        closed.apply(Command::Explore(fence));
        assert_eq!(closed.player, fence);
    }

    #[test]
    fn shelter_changes_energy_and_rest_destination() {
        let mut baseline = World::new(4);
        baseline.residents[0].pos = Pos::new(4, 4);
        baseline.residents[0].energy = 100;
        let mut sheltered = baseline.clone();
        sheltered.inventory.wood = 3;
        sheltered.inventory.fiber = 2;
        sheltered.apply(Command::Place(StructureKind::Shelter, Pos::new(5, 4)));
        sheltered.apply(Command::Wait(2));
        baseline.apply(Command::Wait(3));
        assert!(sheltered.residents[0].energy > baseline.residents[0].energy);
        assert_ne!(sheltered.residents[0].pos, baseline.residents[0].pos);
    }

    #[test]
    fn reserve_moves_materials_without_creating_any() {
        let mut world = World::new(5);
        world.inventory.wood = 5;
        let store = Pos::new(4, 4);
        world.apply(Command::Place(StructureKind::Store, store));
        assert_eq!(world.inventory.wood, 3);
        world.apply(Command::Deposit(store));
        assert_eq!(world.inventory.wood, 0);
        assert_eq!(world.commons.wood, 3);
        world.apply(Command::UseAt(store));
        assert_eq!(world.inventory.wood, 3);
        assert_eq!(world.commons.wood, 0);
    }

    #[test]
    fn new_spatial_actions_replay_and_legacy_saves_remain_readable() {
        let mut world = World::new(6);
        world.apply(Command::UseAt(Pos::new(5, 5)));
        world.apply(Command::Place(StructureKind::Fence, Pos::new(4, 4)));
        world.apply(Command::Dismantle(Pos::new(4, 4)));
        world.apply(Command::Explore(Pos::new(4, 4)));
        world.apply(Command::Deposit(Pos::new(3, 4)));
        assert_eq!(decode(&encode(&world)).unwrap(), world);
        let old = "CORPUS-WORLD 1\nBASE sereine-native:1\nSEED 6\nMOVE U\n";
        assert_eq!(decode(old).unwrap().player, Pos::new(4, 4));
        assert!(decode(&format!("{old}UNKNOWN\n")).is_err());
    }

    #[test]
    fn repeated_passage_materially_reduces_travel_cost() {
        let mut world = World::new(7);
        let changed = Pos::new(4, 4);
        assert_eq!(world.travel_cost(changed), Some(3));
        for _ in 0..3 {
            let _ = world.apply(Command::Move(Direction::Up));
            let _ = world.apply(Command::Move(Direction::Down));
        }
        assert!(world.travel_cost(changed).is_some_and(|cost| cost <= 2));
        for _ in 0..4 {
            let _ = world.apply(Command::Move(Direction::Up));
            let _ = world.apply(Command::Move(Direction::Down));
        }
        assert_eq!(world.travel_cost(changed), Some(1));
        assert!(
            world
                .traces
                .iter()
                .any(|trace| trace.title == "Le sentier devient une route")
        );
    }

    #[test]
    fn open_delta_save_replays_to_same_world_signature() {
        let mut world = World::new(42);
        for command in [
            Command::Move(Direction::Up),
            Command::Move(Direction::Down),
            Command::Interact,
            Command::Wait(9),
        ] {
            let _ = world.apply(command);
        }
        let saved = encode(&world);
        let replayed = decode(&saved).expect("la sauvegarde doit être rejouable");
        assert_eq!(world, replayed);
        assert!(saved.contains("MOVE U"));
    }

    #[test]
    fn different_practices_create_different_worlds() {
        let mut walker = World::new(3);
        let mut waiter = World::new(3);
        for _ in 0..4 {
            let _ = walker.apply(Command::Move(Direction::Up));
            let _ = walker.apply(Command::Move(Direction::Down));
        }
        let _ = waiter.apply(Command::Wait(
            u32::try_from(walker.tick).expect("durée de test bornée"),
        ));
        assert_eq!(walker.tick, waiter.tick);
        assert_ne!(walker.signature(), waiter.signature());
    }

    #[test]
    fn extraction_can_exhaust_a_local_site() {
        let mut world = World::new(5);
        for _ in 0..6 {
            let _ = world.apply(Command::Wait(45));
            let _ = world.apply(Command::Interact);
        }
        let site = world
            .resources
            .iter()
            .find(|site| site.id == "wood-1")
            .expect("site initial");
        assert!(site.exhausted);
        assert!(!site.active);
    }

    #[test]
    fn an_assembly_can_refuse_a_cost_shifting_workshop() {
        let mut world = World::new(8);
        world.inventory.wood = 10;
        world.inventory.stone = 10;
        world.inventory.fiber = 10;
        world.facing = Direction::Up;
        let _ = world.apply(Command::Build(StructureKind::Hearth));
        world.residents[0].helped = true;
        world.residents[0].relation = 2;
        world.residents[1].helped = true;
        world.residents[1].relation = 1;
        world.resources[0].pressure = 300;
        let _ = world.apply(Command::Wait(1));
        let outcome = world.apply(Command::Build(StructureKind::Workshop));
        assert!(world.assembly);
        assert!(matches!(outcome, Outcome::Refused(_)));
    }

    struct RivalTerrain(&'static str, &'static str);

    impl Provider for RivalTerrain {
        fn id(&self) -> &'static str {
            self.0
        }

        fn observe(&self, _world: &World, _query: &ObservationQuery) -> Vec<Candidate> {
            vec![Candidate {
                layer: Layer::Terrain,
                provider: self.id().to_owned(),
                evidence: EvidenceKind::Inferred,
                value: self.1.to_owned(),
                detectable: true,
                note: "hypothèse rivale".to_owned(),
            }]
        }
    }

    #[test]
    fn rival_providers_are_preserved_as_a_contestation() {
        let world = World::new(1);
        let mut model = WorldModel::default();
        model.register(Box::new(RivalTerrain("survey-a", "zone humide")));
        model.register(Box::new(RivalTerrain("registry-b", "terrain sec")));
        let observation = model.observe(&world, &ObservationQuery::player(world.player));
        assert!(matches!(
            observation.layers.get(&Layer::Terrain),
            Some(LayerFinding::Contested { candidates }) if candidates.len() == 2
        ));
    }

    #[test]
    fn a_distant_actor_is_not_automatically_detectable() {
        let world = World::new(1);
        let model = WorldModel::standard();
        let query = ObservationQuery::player(Pos::new(13, 5));
        let observation = model.observe(&world, &query);
        assert_eq!(
            observation.layers.get(&Layer::Actors),
            Some(&LayerFinding::Undetected)
        );
    }

    #[test]
    fn residents_also_make_paths() {
        let mut world = World::new(9);
        let _ = world.apply(Command::Wait(36));
        assert!(world.traffic.values().any(|usage| usage.residents > 0));
    }

    #[test]
    fn an_unmaintained_capacity_can_disappear_while_its_object_remains() {
        let mut world = World::new(11);
        world.inventory.wood = 2;
        world.inventory.stone = 2;
        world.facing = Direction::Up;
        let _ = world.apply(Command::Build(StructureKind::Marker));
        let _ = world.apply(Command::Wait(1_020));
        let marker = world.structures.first().expect("balise construite");
        assert_eq!(marker.kind, StructureKind::Marker);
        assert!(!marker.active);
        assert_eq!(marker.condition, 0);
    }

    #[test]
    fn collective_recovery_can_reopen_but_not_erase_a_loss() {
        let mut world = World::new(12);
        world.assembly = true;
        world.inventory.wood = 2;
        world.inventory.fiber = 3;
        world.facing = Direction::Up;
        world.resources[0].pressure = 220;
        world.resources[0].exhausted = true;
        world.resources[0].active = false;
        let _ = world.apply(Command::Build(StructureKind::Recovery));
        let _ = world.apply(Command::Wait(12));
        assert!(!world.resources[0].exhausted);
        assert!(world.resources[0].pressure > 0);
        assert!(
            world
                .traces
                .iter()
                .any(|trace| trace.title == "Un site redevient praticable")
        );
    }
}
