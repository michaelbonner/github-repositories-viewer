import { RepositoriesList } from "./components/RepositoriesList";
import { TokenSetter } from "./components/TokenSetter";

export default function Home() {
  return (
    <main className="py-12 px-4 mx-auto max-w-7xl sm:px-8">
      <h1 className="text-2xl font-bold sm:text-4xl">
        Github Repositories Viewer
      </h1>
      <TokenSetter />
      <RepositoriesList />
    </main>
  );
}
