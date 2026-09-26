import IdleModeScreen from "@/components/idle/IdleModeScreen";
import { notFound } from "next/navigation";

export default function IdleModePage({ params }: { params: { mode: string } }) {
  if (params.mode !== "farm" && params.mode !== "kitty") notFound();
  return <IdleModeScreen mode={params.mode} />;
}
