"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  FileText,
  LoaderCircle,
  LockKeyhole,
  Ruler,
  Save,
  Upload,
  X,
} from "lucide-react";
import { signInWithEmail } from "@/lib/authServices";

const steps = [
  { icon: Upload, label: "Upload", note: "Muat X-ray" },
  { icon: Ruler, label: "Ukur", note: "Kalibrasi & ukur" },
  { icon: FileText, label: "Template", note: "Pilih implant" },
  { icon: Save, label: "Simpan", note: "Lanjutkan rencana" },
];

const landingCss = `
  .homeLanding,.homeLanding *{box-sizing:border-box}
  .homeLanding{--ink:#eef2f4;--muted:#a6afb4;--line:#343c40;--accent:#27d5dc;min-height:100dvh;display:flex;flex-direction:column;overflow-x:hidden;background:#1b2023;color:var(--ink);font-family:Inter,Arial,sans-serif}
  .homeShell{width:min(1200px,calc(100% - 68px));margin-inline:auto}
  .homeHeader{height:56px;flex:none;border-bottom:1px solid #2c3337}
  .homeHeaderInner{height:100%;display:grid;grid-template-columns:1fr auto 1fr;align-items:center;gap:24px}
  .homeBrand{display:inline-flex;align-items:center;gap:8px;width:max-content;color:#f4f6f7;text-decoration:none;font-size:15px;font-weight:750}
  .homeBrandMark{color:#65a9ff;font-size:31px;font-weight:900;font-style:italic;line-height:.8}
  .homeNav{display:flex;align-items:center;gap:32px}
  .homeNav a{color:#aeb6ba;text-decoration:none;font-size:12px;transition:color .16s}
  .homeNav a:hover{color:#fff}
  .homeHeaderAction{justify-self:end;min-height:34px;padding:0 18px;border:1px solid #394347;border-radius:7px;background:transparent;color:#edf1f3;font:inherit;font-size:11px;font-weight:650;cursor:pointer}
  .homeHeaderAction:hover,.homeButtonSecondary:hover{border-color:#6d858b;background:#252c30}
  .homeMain{display:flex;flex:1;flex-direction:column;justify-content:space-between;min-height:0}
  .homeHero{display:flex;align-items:center;min-height:390px;padding-block:42px 34px}
  .homeCopy{width:100%;max-width:1040px}
  .homeTitle{margin:0;color:#f5f7f8;font-size:54px;font-weight:760;line-height:1.08;letter-spacing:0}
  .homeFree{display:inline-block;margin-top:7px;padding:3px 9px;border:1px solid #34474b;border-radius:6px;background:#26363a;color:#c8faff;font-size:11px;font-weight:650}
  .homeSubtitle{max-width:900px;margin:16px 0 0;color:#f1f3f4;font-size:26px;line-height:1.4;font-weight:450}
  .homeActions{display:flex;gap:14px;margin-top:44px}
  .homeButton{display:inline-flex;min-width:220px;min-height:48px;align-items:center;justify-content:center;gap:10px;border:1px solid transparent;border-radius:7px;padding:0 22px;font:inherit;font-size:13px;font-weight:750;cursor:pointer;transition:background .16s,border-color .16s,transform .16s}
  .homeButton:active{transform:translateY(1px)}
  .homeButtonPrimary{background:var(--accent);color:#08282b}
  .homeButtonPrimary:hover{background:#56e3e7}
  .homeButtonSecondary{border-color:#62858a;background:transparent;color:#f0f4f5}
  .homeFlow{padding:0 0 28px}
  .homeSteps{position:relative;display:grid;grid-template-columns:repeat(4,minmax(0,1fr));padding-top:0}
  .homeSteps:before{position:absolute;top:10px;right:12.5%;left:12.5%;height:1px;background:#577579;content:""}
  .homeStep{position:relative;z-index:1;display:grid;justify-items:start;gap:8px;color:#eaf0f1;font-size:12px}
  .homeStep:nth-child(2),.homeStep:nth-child(3){justify-items:center}
  .homeStep:last-child{justify-items:end}
  .homeStepDot{display:grid;width:21px;height:21px;place-items:center;border-radius:50%;background:var(--accent);color:#0b2527;font-size:10px;font-weight:800;box-shadow:0 0 0 5px #1b2023}
  .homeStepLabel{font-size:12px;line-height:1.2}
  .homeAbout{padding:15px 0 18px;border-top:1px solid #30383c;color:#879398;font-size:10px}
  .homeAboutInner{display:flex;align-items:center;justify-content:space-between;gap:12px}
  .homeAbout a{color:#b5c0c3;text-decoration:none}
  .homeModalBackdrop{position:fixed;inset:0;z-index:100;display:grid;place-items:center;padding:16px;background:rgba(5,9,11,.72);backdrop-filter:blur(6px)}
  .homeLogin{position:relative;width:min(390px,100%);max-height:calc(100dvh - 32px);overflow-y:auto;border:1px solid #3d4b50;border-radius:12px;padding:25px;background:#20272a;box-shadow:0 24px 70px #0008}
  .homeLoginClose{position:absolute;top:13px;right:13px;display:grid;width:34px;height:34px;place-items:center;border:1px solid #3b464a;border-radius:7px;background:#1a2023;color:#dfe6e8;cursor:pointer}
  .homeLogin h2{margin:0;font-size:21px;line-height:1.25}
  .homeLoginIntro{margin:6px 0 22px;color:#a6b0b4;font-size:12px;line-height:1.5}
  .homeForm{display:grid;gap:14px}
  .homeForm label{display:grid;gap:6px;color:#c5ced1;font-size:11px;font-weight:650}
  .homeInput{width:100%;height:42px;border:1px solid #3c484d;border-radius:7px;padding:0 11px;outline:none;background:#171d20;color:#f2f5f6;font:inherit;font-size:13px}
  .homeInput:focus{border-color:var(--accent);box-shadow:0 0 0 2px #27d5dc25}
  .homeError{margin:0;border:1px solid #81484a;border-radius:6px;padding:8px;color:#ffb5b5;background:#392426;font-size:11px}
  .homeSubmit{width:100%;margin-top:4px}
  @media(max-width:760px){
    .homeShell{width:min(100% - 32px,560px)}
    .homeHeader{height:54px}
    .homeHeaderInner{grid-template-columns:1fr auto;gap:10px}
    .homeBrand{font-size:13px}.homeBrandMark{font-size:28px}
    .homeNav{display:none}
    .homeHero{min-height:0;padding-block:54px 48px}
    .homeTitle{font-size:40px}
    .homeSubtitle{max-width:660px;font-size:21px}
    .homeActions{gap:11px;margin-top:34px}
    .homeButton{min-width:190px;min-height:46px;padding-inline:16px}
    .homeFlow{padding-bottom:22px}
    .homeSteps:before{right:12%;left:12%}
    .homeStep{gap:7px;font-size:10px}
    .homeStepLabel{font-size:10px}
    .homeAboutInner{flex-wrap:wrap;font-size:9px}
  }
  @media(max-width:390px){
    .homeShell{width:calc(100% - 24px)}
    .homeHero{padding-block:42px 36px}
    .homeTitle{font-size:34px}
    .homeSubtitle{font-size:18px}
    .homeActions{flex-direction:column;align-items:stretch}
    .homeButton{width:100%;min-width:0}
    .homeStepLabel{font-size:9px}
  }
  @media(prefers-reduced-motion:reduce){.homeLanding *{scroll-behavior:auto!important;transition:none!important}}
`;

export default function HomeLanding() {
  const [loginOpen, setLoginOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  const signIn = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError("");
    const result = await signInWithEmail(email, password);
    if (result.error) {
      const invalid = /user-not-found|wrong-password|invalid-credential/i.test(
        result.error,
      );
      setError(
        invalid
          ? "Email atau password tidak valid."
          : "Login belum berhasil. Periksa koneksi lalu coba lagi.",
      );
      setLoading(false);
      return;
    }
    router.replace("/simple");
  };

  const showLogin = () => {
    setError("");
    setLoginOpen(true);
  };

  return (
    <main className="homeLanding">
      <style>{landingCss}</style>
      <header className="homeHeader">
        <div className="homeShell homeHeaderInner">
          <a className="homeBrand" href="#beranda" aria-label="Zakzav Templating">
            <span className="homeBrandMark">Z</span>
            <span>Zakzav Templating</span>
          </a>
          <nav className="homeNav" aria-label="Navigasi utama">
            <a href="#beranda">Beranda</a>
            <a href="#fitur">Fitur</a>
            <a href="#alur">Alur Kerja</a>
            <a href="#tentang">Tentang</a>
          </nav>
          <button type="button" className="homeHeaderAction" onClick={showLogin}>
            Masuk
          </button>
        </div>
      </header>

      <div className="homeMain" id="beranda">
        <section className="homeShell homeHero" id="fitur">
          <div className="homeCopy">
            <h1 className="homeTitle">Zakzav Templating</h1>
            <span className="homeFree">Gratis</span>
            <p className="homeSubtitle">Aplikasi pengukuran templating ortopedi.</p>
            <div className="homeActions">
              <button type="button" className="homeButton homeButtonPrimary" onClick={showLogin}>
                Coba Gratis <ArrowRight size={15} />
              </button>
              <button type="button" className="homeButton homeButtonSecondary" onClick={showLogin}>
                Masuk
              </button>
            </div>
          </div>

        </section>

        <section className="homeShell homeFlow" id="alur" aria-label="Alur kerja">
          <div className="homeSteps">
            {steps.map(({ icon: Icon, label }, index) => (
              <div className="homeStep" key={label}>
                <span className="homeStepDot">{index + 1}</span>
                <span className="homeStepLabel">{label}</span>
              </div>
            ))}
          </div>
        </section>
      </div>

      <footer className="homeAbout" id="tentang">
        <div className="homeShell homeAboutInner">
          <span>© 2026 Zakzav Templating</span>
          <span>Pengukuran templating ortopedi berbasis web</span>
          <a href="mailto:support@zakzav.com">Kontak</a>
        </div>
      </footer>

      {loginOpen ? (
        <div className="homeModalBackdrop" onClick={(event) => event.target === event.currentTarget && setLoginOpen(false)}>
          <section className="homeLogin" role="dialog" aria-modal="true" aria-labelledby="home-login-title">
            <button type="button" className="homeLoginClose" onClick={() => setLoginOpen(false)} aria-label="Tutup login"><X size={16} /></button>
            <h2 id="home-login-title">Masuk ke Zakzav</h2>
            <p className="homeLoginIntro">Gunakan akun Anda untuk membuka workspace templating.</p>
            <form className="homeForm" onSubmit={signIn}>
              <label>Email<input className="homeInput" type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" placeholder="email@contoh.com" required disabled={loading} /></label>
              <label>Password<input className="homeInput" type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="current-password" placeholder="Masukkan password" required disabled={loading} /></label>
              {error ? <p className="homeError" role="alert">{error}</p> : null}
              <button type="submit" className="homeButton homeButtonPrimary homeSubmit" disabled={loading}>
                {loading ? <LoaderCircle size={15} className="animate-spin" /> : <LockKeyhole size={15} />}
                {loading ? "Memproses..." : "Masuk"}
              </button>
            </form>
          </section>
        </div>
      ) : null}
    </main>
  );
}
