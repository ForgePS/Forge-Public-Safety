import { createContext, useContext } from "react";
import { content as staticContent } from "./loadContent.js";

const ContentContext = createContext(staticContent);

export const useContent = () => useContext(ContentContext);

export function MarketingContentProvider({ children }) {
  return <ContentContext.Provider value={staticContent}>{children}</ContentContext.Provider>;
}
