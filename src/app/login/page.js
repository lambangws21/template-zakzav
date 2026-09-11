"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowRight,
  Circle,
  Download,
  Eye,
  EyeOff,
  FileText,
  Gift,
  Globe2,
  Loader2,
  LogIn,
  Monitor,
  RotateCcw,
  Ruler,
  Save,
  Type,
  Upload,
  X,
} from "lucide-react";
import { signInWithEmail } from "@/lib/authServices";

const FEATURES = [
  {
    icon: Ruler,
    title: "Pengukuran Templating",
    copy: "Ukur radiografi dan rencanakan implant secara presisi.",
  },
  {
    icon: Monitor,
    title: "Tampilan Sederhana",
    copy: "Alur kerja fokus untuk kebutuhan perencanaan klinis.",
  },
  {
    icon: Gift,
    title: "Gratis Digunakan",
    copy: "Mulai melakukan templating langsung tanpa biaya.",
  },
  {
    icon: Globe2,
    title: "Akses Web",
    copy: "Buka melalui browser, kapan saja dan di mana saja.",
  },
];

const STEPS = [
  { icon: Upload, title: "Upload X-ray", copy: "Unggah radiografi pasien." },
  { icon: Ruler, title: "Ukur", copy: "Kalibrasi dan lakukan pengukuran." },
  { icon: FileText, title: "Template", copy: "Pilih dan sesuaikan implant." },
  { icon: Save, title: "Simpan", copy: "Simpan hasil perencanaan." },
];

const LOGIN_STYLES = `
  .zlp,.zlp *{box-sizing:border-box}.zlp{min-height:100dvh;overflow-x:hidden;color:#f5f7ff;background:#07111f;font-family:Inter,ui-sans-serif,system-ui,sans-serif}.zlp-shell{width:min(100% - 40px,1460px);margin-inline:auto}
  .zlp-header{position:relative;z-index:20;height:70px;border-bottom:1px solid rgba(130,155,201,.16);background:rgba(7,17,31,.84);backdrop-filter:blur(18px)}.zlp-header-inner{height:100%;display:flex;align-items:center;justify-content:space-between;gap:28px}.zlp-brand{display:inline-flex;align-items:center;gap:11px;color:#f8faff;font-size:17px;font-weight:800;text-decoration:none}.zlp-mark{font-size:34px;line-height:1;font-weight:900;font-style:italic;color:#7796ff;text-shadow:0 0 22px rgba(92,105,255,.38)}
  .zlp-nav{display:flex;align-items:center;gap:38px}.zlp-nav a{position:relative;color:#b8c4d9;font-size:12px;font-weight:600;text-decoration:none}.zlp-nav a:first-child{color:#fff}.zlp-nav a:first-child:after{content:"";position:absolute;right:0;bottom:-22px;left:0;height:2px;background:#7d65ff}.zlp-button{min-height:44px;border:0;border-radius:10px;padding:0 24px;color:#fff;font:inherit;font-size:12px;font-weight:800;cursor:pointer}.zlp-button-primary{background:linear-gradient(135deg,#745cff,#3989ff);box-shadow:0 10px 30px rgba(64,79,255,.34)}.zlp-button-outline{border:1px solid rgba(114,142,255,.62);background:rgba(9,19,34,.42)}
  .zlp-hero-wrap{position:relative;isolation:isolate;border-bottom:1px solid rgba(130,155,201,.1)}.zlp-hero-wrap:before{content:"";position:absolute;inset:0;z-index:-1;background:radial-gradient(circle at 64% 38%,rgba(67,76,176,.18),transparent 35%),linear-gradient(128deg,transparent 0 49%,rgba(39,55,101,.12) 49% 72%,transparent 72%)}.zlp-hero{min-height:462px;display:grid;grid-template-columns:minmax(390px,.9fr) minmax(560px,1.1fr);align-items:center;gap:34px;padding-block:26px}
  .zlp-kicker{margin:0 0 12px;color:#7f90af;font-size:12px;font-weight:800;letter-spacing:.15em;text-transform:uppercase}.zlp-title{margin:0;max-width:670px;font-size:clamp(42px,4vw,62px);line-height:.98;letter-spacing:0;font-weight:900}.zlp-title-accent{color:#8187ff}.zlp-free{display:inline-flex;vertical-align:middle;margin-left:10px;transform:translateY(-4px);border-radius:999px;padding:12px 22px;color:#fff;background:linear-gradient(135deg,#6232ef,#1e5df1);box-shadow:0 8px 26px rgba(80,60,255,.45);font-size:21px}.zlp-subtitle{margin:15px 0 0;max-width:590px;font-size:clamp(22px,2vw,32px);line-height:1.25;font-weight:650}.zlp-copy{max-width:610px;margin:12px 0 0;color:#a9b7ce;font-size:15px;line-height:1.55}.zlp-actions{display:flex;gap:18px;margin-top:24px}.zlp-actions .zlp-button{min-width:168px;display:inline-flex;align-items:center;justify-content:center;gap:12px}
  .zlp-visual{position:relative;height:405px;min-width:0}.zlp-workspace{position:absolute;inset:15px 106px 10px 0;overflow:hidden;transform:rotate(2deg);border:1px solid rgba(139,161,204,.35);border-radius:18px;background:#0a1525;box-shadow:0 24px 60px rgba(0,0,0,.36)}.zlp-xray{position:absolute;inset:15px 126px 15px 15px;overflow:hidden;border:1px solid rgba(124,151,199,.2);border-radius:9px;background:#020710}.zlp-xray img{width:100%;height:100%;object-fit:cover;object-position:82% center;filter:invert(1) grayscale(1) contrast(1.25);opacity:.76}.zlp-xray:after{content:"";position:absolute;inset:0;background:linear-gradient(90deg,rgba(7,17,31,.08),transparent 55%,rgba(7,17,31,.2));pointer-events:none}
  .zlp-measure-ring{position:absolute;left:44%;top:30%;width:92px;aspect-ratio:1;border:1px dashed rgba(218,227,255,.9);border-radius:50%;box-shadow:inset 0 0 0 24px rgba(200,215,255,.04)}.zlp-measure-ring:before,.zlp-measure-ring:after{content:"";position:absolute;background:rgba(218,227,255,.8)}.zlp-measure-ring:before{left:50%;top:-28px;width:1px;height:148px;border-left:1px dashed rgba(218,227,255,.65);background:transparent}.zlp-measure-ring:after{top:50%;left:-28px;width:148px;height:1px}.zlp-size{position:absolute;left:calc(44% + 98px);top:31%;font-size:10px;color:#dce5fa}
  .zlp-side-tools{position:absolute;top:32px;right:20px;width:92px;padding:14px 12px;border:1px solid rgba(111,139,191,.18);border-radius:10px;background:rgba(7,17,31,.58)}.zlp-side-title{display:flex;align-items:center;gap:7px;margin-bottom:15px;font-size:11px;font-weight:800}.zlp-side-title:before{content:"";width:16px;height:2px;background:#826eff}.zlp-tool{display:flex;align-items:center;gap:8px;margin-top:12px;color:#8190aa;font-size:8px}.zlp-tool svg{width:12px;height:12px;color:#a7b8d7}.zlp-secondary-xray{position:absolute;right:0;top:85px;width:142px;height:225px;overflow:hidden;transform:rotate(3deg);border:1px solid rgba(108,132,176,.22);border-radius:9px;background:#050c16;box-shadow:0 18px 40px rgba(0,0,0,.32)}.zlp-secondary-xray img{width:100%;height:100%;object-fit:cover;object-position:50% 35%;filter:invert(1) grayscale(1) contrast(1.35);opacity:.62}.zlp-note{position:absolute;right:0;bottom:28px;width:220px;transform:rotate(-5deg);color:#8298ff;font-family:Poppins,sans-serif;font-size:14px;font-style:italic;line-height:1.35}.zlp-note:after{content:"";display:block;width:70px;height:3px;margin:9px 0 0 22px;background:linear-gradient(90deg,#8b5cff,#3f7cff);transform:rotate(-5deg)}
  .zlp-section{padding-block:25px 28px;background:linear-gradient(180deg,#0a1525,#07111f)}.zlp-section-head{display:flex;align-items:end;justify-content:space-between;gap:20px;margin-bottom:14px}.zlp-eyebrow{margin:0 0 5px;color:#7486a5;font-size:9px;font-weight:800;letter-spacing:.14em;text-transform:uppercase}.zlp-section h2{margin:0;font-size:23px;line-height:1.2}.zlp-section-aside{max-width:190px;color:#71819f;font-size:9px;font-weight:700;letter-spacing:.08em;text-transform:uppercase}.zlp-feature-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:16px}.zlp-feature{min-height:128px;display:grid;grid-template-columns:56px 1fr;gap:15px;align-items:start;padding:18px;border:1px solid rgba(116,141,187,.25);border-radius:8px;background:rgba(17,31,52,.56)}.zlp-feature-icon,.zlp-step-icon{display:grid;place-items:center;width:56px;aspect-ratio:1;border:1px solid rgba(105,126,255,.2);border-radius:50%;color:#6290ff;background:rgba(80,91,182,.17)}.zlp-feature-icon svg{width:27px;height:27px}.zlp-feature h3{margin:10px 0 7px;font-size:13px}.zlp-feature p{margin:0;color:#a2b0c8;font-size:11px;line-height:1.5}
  .zlp-flow{display:grid;grid-template-columns:310px 1fr;align-items:center;gap:24px;margin-top:23px}.zlp-flow-title h2{max-width:270px;font-size:22px;line-height:1.35}.zlp-steps{display:grid;grid-template-columns:repeat(4,1fr);border:1px solid rgba(116,141,187,.18);border-radius:10px;background:rgba(16,29,49,.6)}.zlp-step{position:relative;min-height:92px;display:flex;align-items:center;gap:12px;padding:12px 16px}.zlp-step:not(:last-child):after{content:"→";position:absolute;right:-5px;color:#7e91b5;font-size:21px}.zlp-step-icon{width:48px;flex:0 0 auto;border-radius:15px;color:#b0bdff}.zlp-step-icon svg{width:23px;height:23px}.zlp-step-number{position:absolute;left:10px;top:6px;display:grid;place-items:center;width:21px;height:21px;border-radius:50%;background:#6778ed;font-size:9px;font-weight:900}.zlp-step h3{margin:0 0 5px;font-size:11px}.zlp-step p{margin:0;color:#8594ae;font-size:9px;line-height:1.45}
  .zlp-footer{border-top:1px solid rgba(130,155,201,.22);background:#07101d}.zlp-footer-inner{min-height:72px;display:flex;align-items:center;justify-content:space-between;gap:22px;color:#65748e;font-size:9px}.zlp-footer-brand{display:flex;align-items:center;gap:10px;color:#eef3ff;font-weight:800}.zlp-footer-links{display:flex;gap:18px}
  .zlp-modal-backdrop{position:fixed;inset:0;z-index:100;display:grid;place-items:center;padding:20px;background:rgba(2,7,16,.78);backdrop-filter:blur(12px)}.zlp-login-card{position:relative;width:min(100%,390px);padding:28px;border:1px solid rgba(131,153,206,.25);border-radius:16px;background:#101c2e;box-shadow:0 28px 80px rgba(0,0,0,.52)}.zlp-login-close{position:absolute;top:12px;right:12px;display:grid;place-items:center;width:32px;height:32px;border:1px solid rgba(130,155,201,.2);border-radius:8px;color:#9aaac4;background:#0a1525;cursor:pointer}.zlp-login-logo{display:flex;align-items:center;gap:10px;margin-bottom:22px}.zlp-login-logo .zlp-mark{font-size:27px}.zlp-login-card h2{margin:0 0 5px;font-size:22px}.zlp-login-card>p{margin:0 0 22px;color:#8798b5;font-size:12px}.zlp-form{display:grid;gap:14px}.zlp-label{display:block;margin-bottom:6px;color:#aab8ce;font-size:10px;font-weight:800}.zlp-input-wrap{position:relative;display:block}.zlp-input{width:100%;height:44px;border:1px solid rgba(132,154,197,.24);border-radius:9px;padding:0 12px;outline:0;color:#f5f7ff;background:#091422;font:inherit;font-size:12px}.zlp-input:focus{border-color:#697bff;box-shadow:0 0 0 3px rgba(105,123,255,.12)}.zlp-password{padding-right:44px}.zlp-eye{position:absolute;top:0;right:0;display:grid;place-items:center;width:44px;height:44px;border:0;color:#8090aa;background:transparent;cursor:pointer}.zlp-submit{width:100%;margin-top:3px;display:flex;align-items:center;justify-content:center;gap:8px}.zlp-error{padding:9px 11px;border:1px solid rgba(248,113,113,.25);border-radius:8px;color:#fda4af;background:rgba(190,24,93,.1);font-size:10px}
  @media(max-width:1050px){.zlp-hero{grid-template-columns:1fr 1fr}.zlp-visual{height:350px}.zlp-workspace{right:36px}.zlp-secondary-xray,.zlp-note{display:none}.zlp-feature-grid{grid-template-columns:repeat(2,1fr)}.zlp-flow{grid-template-columns:240px 1fr}.zlp-steps{grid-template-columns:repeat(2,1fr)}.zlp-step:nth-child(2):after{display:none}}
  @media(max-width:760px){.zlp-shell{width:min(100% - 28px,620px)}.zlp-header{height:58px}.zlp-brand{font-size:13px}.zlp-mark{font-size:27px}.zlp-nav{display:none}.zlp-header .zlp-button{min-height:36px;padding:0 16px}.zlp-hero{min-height:0;grid-template-columns:1fr;gap:20px;padding-block:32px 20px}.zlp-kicker{font-size:9px}.zlp-title{font-size:clamp(35px,11vw,50px);line-height:1.04}.zlp-free{margin-left:5px;padding:8px 13px;font-size:15px}.zlp-subtitle{margin-top:13px;font-size:21px}.zlp-copy{font-size:12px}.zlp-actions{gap:10px;margin-top:20px}.zlp-actions .zlp-button{min-width:0;flex:1;min-height:42px;padding-inline:12px}.zlp-visual{height:auto;aspect-ratio:16/10}.zlp-workspace{inset:0;transform:none;border-radius:12px}.zlp-xray{inset:9px 85px 9px 9px}.zlp-side-tools{top:16px;right:10px;width:68px;padding:9px 7px}.zlp-side-title{margin-bottom:8px;font-size:8px}.zlp-tool{gap:5px;margin-top:7px;font-size:6px}.zlp-tool svg{width:9px;height:9px}.zlp-measure-ring{width:62px}.zlp-size{font-size:7px}.zlp-section{padding-block:24px}.zlp-section-head{align-items:start}.zlp-section h2{font-size:20px}.zlp-section-aside{display:none}.zlp-feature-grid{grid-template-columns:1fr 1fr;gap:9px}.zlp-feature{min-height:0;grid-template-columns:36px 1fr;gap:9px;padding:12px}.zlp-feature-icon{width:36px}.zlp-feature-icon svg{width:18px;height:18px}.zlp-feature h3{margin:3px 0 5px;font-size:10px}.zlp-feature p{font-size:8px}.zlp-flow{grid-template-columns:1fr;gap:12px}.zlp-flow-title h2{font-size:18px}.zlp-steps{grid-template-columns:repeat(2,1fr)}.zlp-step{min-height:78px;padding:10px}.zlp-step:after{display:none}.zlp-step-icon{width:40px}.zlp-step-icon svg{width:19px;height:19px}.zlp-footer-inner{min-height:92px;flex-wrap:wrap;padding-block:16px}.zlp-footer-links{order:3;width:100%}.zlp-login-card{padding:24px 20px}}
  @media(max-width:390px){.zlp-feature-grid{grid-template-columns:1fr}.zlp-title{font-size:34px}}
`;

function Brand() {
  return (
    <span className="zlp-brand">
      <span className="zlp-mark">Z</span>
      <span>Zakzav Templating</span>
    </span>
  );
}

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loginOpen, setLoginOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const router = useRouter();

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError(null);
    const { error: authError } = await signInWithEmail(email, password);
    if (authError) {
      const invalid =
        authError.includes("user-not-found") ||
        authError.includes("wrong-password") ||
        authError.includes("invalid-credential");
      setError(
        invalid
          ? "Email atau password tidak valid."
          : "Terjadi kesalahan. Coba lagi.",
      );
      setLoading(false);
      return;
    }
    router.replace("/simple");
  };

  const openLogin = () => {
    setError(null);
    setLoginOpen(true);
  };

  return (
    <main className="zlp">
      <style>{LOGIN_STYLES}</style>
      <header className="zlp-header">
        <div className="zlp-shell zlp-header-inner">
          <a href="#beranda" aria-label="Zakzav Templating - Beranda">
            <Brand />
          </a>
          <nav className="zlp-nav" aria-label="Navigasi utama">
            <a href="#beranda">Beranda</a>
            <a href="#fitur">Fitur</a>
            <a href="#alur">Alur Kerja</a>
            <a href="#tentang">Tentang</a>
          </nav>
          <button
            type="button"
            className="zlp-button zlp-button-primary"
            onClick={openLogin}
          >
            Masuk
          </button>
        </div>
      </header>

      <div id="beranda" className="zlp-hero-wrap">
        <section className="zlp-shell zlp-hero">
          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55 }}
          >
            <p className="zlp-kicker">
              Perencanaan lebih baik, hasil lebih optimal.
            </p>
            <h1 className="zlp-title">
              Zakzav <span className="zlp-title-accent">Templating</span>
              <span className="zlp-free">Gratis</span>
            </h1>
            <p className="zlp-subtitle">
              Aplikasi gratis untuk pengukuran templating ortopedi.
            </p>
            <p className="zlp-copy">
              Bantu Anda melakukan pengukuran dan perencanaan implant dengan
              mudah dari gambar radiografi (X-ray).
            </p>
            <div className="zlp-actions">
              <button
                type="button"
                className="zlp-button zlp-button-primary"
                onClick={openLogin}
              >
                Coba Gratis <ArrowRight size={16} />
              </button>
              <button
                type="button"
                className="zlp-button zlp-button-outline"
                onClick={openLogin}
              >
                Masuk
              </button>
            </div>
          </motion.div>

          <motion.div
            className="zlp-visual"
            initial={{ opacity: 0, x: 28 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.7, delay: 0.08 }}
            aria-label="Pratinjau workspace templating X-ray"
          >
            <div className="zlp-workspace">
              <div className="zlp-xray">
                <img
                  src="/images/jurnal-scheerlinck/fig5-templating-rotation-centre.jpeg"
                  alt="Radiografi pinggul dengan implant"
                />
                <span className="zlp-measure-ring" />
                <span className="zlp-size">52 mm</span>
              </div>
              <aside
                className="zlp-side-tools"
                aria-label="Contoh alat templating"
              >
                <div className="zlp-side-title">Templating</div>
                <div className="zlp-tool">
                  <Ruler /> Garis ukur
                </div>
                <div className="zlp-tool">
                  <Circle /> Lingkaran
                </div>
                <div className="zlp-tool">
                  <Type /> Teks
                </div>
                <div className="zlp-tool">
                  <RotateCcw /> Reset
                </div>
                <div className="zlp-tool">
                  <Download /> Export
                </div>
              </aside>
            </div>
            <div className="zlp-secondary-xray">
              <img
                src="/images/jurnal-scheerlinck/fig1-anatomical-landmarks.jpeg"
                alt="Radiografi pelvis untuk pengukuran anatomi"
              />
            </div>
            <div className="zlp-note">
              Dari Radiografi, menuju rencana yang lebih baik
            </div>
          </motion.div>
        </section>
      </div>

      <section id="fitur" className="zlp-section">
        <div className="zlp-shell">
          <div className="zlp-section-head">
            <div>
              <p className="zlp-eyebrow">Fitur Utama</p>
              <h2>Sederhana, lengkap, dan gratis.</h2>
            </div>
            <div className="zlp-section-aside">
              Untuk profesional ortopedi di mana saja
            </div>
          </div>
          <div className="zlp-feature-grid">
            {FEATURES.map(({ icon: Icon, title, copy }) => (
              <article className="zlp-feature" key={title}>
                <div className="zlp-feature-icon">
                  <Icon />
                </div>
                <div>
                  <h3>{title}</h3>
                  <p>{copy}</p>
                </div>
              </article>
            ))}
          </div>
          <div id="alur" className="zlp-flow">
            <div className="zlp-flow-title">
              <p className="zlp-eyebrow">Alur Kerja Mudah</p>
              <h2>Dari X-ray ke rencana, hanya beberapa langkah.</h2>
            </div>
            <div className="zlp-steps">
              {STEPS.map(({ icon: Icon, title, copy }, index) => (
                <article className="zlp-step" key={title}>
                  <span className="zlp-step-number">{index + 1}</span>
                  <div className="zlp-step-icon">
                    <Icon />
                  </div>
                  <div>
                    <h3>{title}</h3>
                    <p>{copy}</p>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </div>
      </section>

      <footer id="tentang" className="zlp-footer">
        <div className="zlp-shell zlp-footer-inner">
          <div className="zlp-footer-brand">
            <span className="zlp-mark">Z</span> Zakzav Templating
          </div>
          <span>Alat bantu pengukuran templating ortopedi berbasis web.</span>
          <div className="zlp-footer-links">
            <span>Tentang</span>
            <span>Privasi</span>
            <span>Kontak</span>
          </div>
          <span>© 2026 Zakzav Templating.</span>
        </div>
      </footer>

      <AnimatePresence>
        {loginOpen ? (
          <motion.div
            className="zlp-modal-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onMouseDown={() => setLoginOpen(false)}
          >
            <motion.section
              role="dialog"
              aria-modal="true"
              aria-labelledby="login-title"
              className="zlp-login-card"
              initial={{ opacity: 0, y: 20, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 14, scale: 0.98 }}
              transition={{ type: "spring", damping: 24, stiffness: 300 }}
              onMouseDown={(event) => event.stopPropagation()}
            >
              <button
                type="button"
                className="zlp-login-close"
                onClick={() => setLoginOpen(false)}
                aria-label="Tutup login"
              >
                <X size={15} />
              </button>
              <div className="zlp-login-logo">
                <span className="zlp-mark">Z</span>
                <strong>Zakzav Templating</strong>
              </div>
              <h2 id="login-title">Selamat datang kembali</h2>
              <p>Masuk untuk melanjutkan ke workspace templating.</p>
              <form className="zlp-form" onSubmit={handleSubmit}>
                <label>
                  <span className="zlp-label">Email</span>
                  <input
                    className="zlp-input"
                    type="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder="email@contoh.com"
                    autoComplete="email"
                    required
                    disabled={loading}
                  />
                </label>
                <label>
                  <span className="zlp-label">Password</span>
                  <span className="zlp-input-wrap">
                    <input
                      className="zlp-input zlp-password"
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                      placeholder="Masukkan password"
                      autoComplete="current-password"
                      required
                      disabled={loading}
                    />
                    <button
                      type="button"
                      className="zlp-eye"
                      onClick={() => setShowPassword((value) => !value)}
                      aria-label={
                        showPassword
                          ? "Sembunyikan password"
                          : "Tampilkan password"
                      }
                    >
                      {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </span>
                </label>
                {error ? (
                  <div className="zlp-error" role="alert">
                    {error}
                  </div>
                ) : null}
                <button
                  type="submit"
                  className="zlp-button zlp-button-primary zlp-submit"
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <Loader2 size={15} className="animate-spin" />{" "}
                      Memproses...
                    </>
                  ) : (
                    <>
                      <LogIn size={15} /> Masuk ke Workspace
                    </>
                  )}
                </button>
              </form>
            </motion.section>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </main>
  );
}
