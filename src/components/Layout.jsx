import { Outlet } from "react-router-dom";
import Header from "./Header.jsx";
import Footer from "./Footer.jsx";
import ThemeStyle from "./ThemeStyle.jsx";

export default function Layout() {
  return (
    <div className="min-h-screen flex flex-col bg-black">
      <ThemeStyle />
      <Header />
      <main className="flex-1">
        <Outlet />
      </main>
      <Footer />
    </div>
  );
}
