import "./app.css";

export const metadata = {
  title: "Template ZakZav",
  description: "Template for Next ZakZav",
};

export default function RootLayout({ children }) {
  return (
    <html lang="id" suppressHydrationWarning>
      <head>
        <link rel="icon" href="/zakzav.svg" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=Fira+Code&family=Inter:opsz,wght@14..32,100..900&family=Poppins:wght@300;400&display=swap"
          rel="stylesheet"
        />
        <link rel="icon" type="image/svg+xml" href="/zakzav.svg" />
      </head>
      <body className={"bg-[#FAFAFB] font-[Inter] text-sm text-[#56565C]"}>
        {children}
      </body>
    </html>
  );
}
