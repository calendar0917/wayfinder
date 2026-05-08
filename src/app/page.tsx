import { readConfig, readConfigSafe } from "@/lib/config";
import { Dashboard } from "@/components/layout/Dashboard";

export default async function HomePage() {
  const config = readConfigSafe();
  return <Dashboard config={config} />;
}
