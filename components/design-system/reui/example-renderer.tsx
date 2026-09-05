"use client";

import { useEffect } from "react";
import { reuiExampleComponents } from "./catalogue-data/example-components.generated";

export function ReuiExampleRenderer({ name }: { name: string }) {
  const Example = reuiExampleComponents[name];
  if (!Example) return null;

  return <Example />;
}

export function ReuiPreviewDocumentScope() {
  useEffect(() => {
    const root = document.body;
    root.classList.add("reui-scope", "style-nova");
    return () => root.classList.remove("reui-scope", "style-nova");
  }, []);

  return null;
}
