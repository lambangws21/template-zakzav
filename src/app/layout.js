import "./app.css";
import { AuthProvider } from "@/context/AuthContext";
import AppAuthGate from "@/components/AppAuthGate";

export const metadata = {
  title: "Template ZakZav",
  description: "Template for Next ZakZav",
};

// Runs before React hydrates — prevents flash of wrong theme
const themeScript = `
(function(){
  try {
    var t = localStorage.getItem('zakzav-theme');
    if (!t) t = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    if (t === 'dark') document.documentElement.setAttribute('data-theme','dark');
  } catch(e) {}
})();
`;

export default function RootLayout({ children }) {
  return (
    <html lang="id" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
        <link rel="icon" href="/zakzav.svg" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=Fira+Code&family=Inter:opsz,wght@14..32,100..900&family=Poppins:wght@300;400&display=swap"
          rel="stylesheet"
        />
        <link rel="icon" type="image/svg+xml" href="/zakzav.svg" />
      </head>
      <body className="font-[Inter] text-sm" style={{ background: "var(--color-body-bg)", color: "var(--color-text-base)" }}>
        <AuthProvider>
          <AppAuthGate>{children}</AppAuthGate>
        </AuthProvider>
      </body>
    </html>
  );
}
