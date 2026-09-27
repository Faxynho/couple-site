import { notFound } from "next/navigation";
import IdleModeScreen from "@/components/idle/IdleModeScreen";

export default function IdleDevModePage({ params }: { params: { mode: string } }) {
  if (params.mode !== "farm" && params.mode !== "kitty") notFound();
  return <IdleModeScreen mode={params.mode} environment="dev" />;
}
