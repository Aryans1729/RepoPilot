import { useState } from "react";
import UploadPage from "./pages/UploadPage";
import DashboardPage from "./pages/DashboardPage";

export default function App() {
  const [repoId, setRepoId] = useState(null);
  const [structure, setStructure] = useState(null);

  if (!repoId) {
    return (
      <UploadPage
        onAnalyzed={({ repoId: id, structure: s }) => {
          setRepoId(id);
          setStructure(s);
        }}
      />
    );
  }

  return (
    <DashboardPage
      repoId={repoId}
      structure={structure}
      onReset={() => {
        setRepoId(null);
        setStructure(null);
      }}
    />
  );
}

