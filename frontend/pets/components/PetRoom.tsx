import type { PetDefinition } from "../config";
import PetRoomScene from "./PetRoomScene";
import PetRoomDrawer from "./PetRoomDrawer";
import styles from "../PetRoom.module.css";

export default function PetRoom({ pet }: { pet: PetDefinition }) {
  return (
    <div className={styles.roomLayout}>
      <PetRoomScene pet={pet} />
      <PetRoomDrawer pet={pet} />
    </div>
  );
}
