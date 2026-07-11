import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../cms/context/AuthContext.jsx";

export default function LoginPage() {
  const [email, setEmail] = useState("admin@forgepublicsafety.com");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await login(email, password);
      navigate("/admin");
    } catch (err) {
      setError(err.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0B1220] flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-black text-white">Forge CMS</h1>
          <p className="text-[#64748B] mt-2">Sign in to manage your website</p>
        </div>
        <form onSubmit={handleSubmit} className="rounded-2xl border border-[#1E293B] bg-[#111827] p-8 space-y-5">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-white mb-1">Email</label>
            <input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required className="w-full rounded-xl bg-[#0B1220] border border-[#1E293B] px-4 py-3 text-white focus:outline-none focus:border-[#F97316]" />
          </div>
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-white mb-1">Password</label>
            <input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required className="w-full rounded-xl bg-[#0B1220] border border-[#1E293B] px-4 py-3 text-white focus:outline-none focus:border-[#F97316]" />
          </div>
          {error && <p className="text-red-400 text-sm">{error}</p>}
          <button type="submit" disabled={loading} className="w-full rounded-full py-3 text-sm font-bold text-white bg-[#F97316] hover:bg-[#ea580c] disabled:opacity-50">
            {loading ? "Signing in..." : "Sign In"}
          </button>
          <p className="text-xs text-[#64748B] text-center">Local dev: use password &quot;admin&quot;</p>
        </form>
      </div>
    </div>
  );
}
