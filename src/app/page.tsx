import { RepositoriesList } from "./components/RepositoriesList";
import { TokenSetter } from "./components/TokenSetter";

export default function Home() {
  return (
    <main className="max-w-7xl mx-auto py-12 px-4 sm:px-8">
      <h1 className="text-2xl sm:text-4xl font-bold">
        Github Repositories Viewer
      </h1>
      <TokenSetter />
      <RepositoriesList />
    </main>
  );
}
