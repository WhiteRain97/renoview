'use client';
import React, { useRef, useState } from 'react';
import { Wand2, Sparkles, FileDown } from 'lucide-react';

/* ---------------- UI shims (no Tailwind) ---------------- */
const Card = ({ children, className = '' }: any) => (
  <div
    className={`rounded-2xl ${className}`}
    style={{
      border: '1px solid #e5e7eb',
      borderRadius: 16,
      background: 'white',
      boxShadow: '0 2px 8px rgba(0,0,0,.04)',
    }}
  >
    {children}
  </div>
);
const CardHeader = ({ children }: any) => (
  <div
    style={{
      padding: '24px',
      borderBottom: '1px solid #eee',
      borderTopLeftRadius: 16,
      borderTopRightRadius: 16,
    }}
  >
    {children}
  </div>
);
const CardTitle = ({ children }: any) => (
  <h2 style={{ fontSize: 18, fontWeight: 600, margin: 0 }}>{children}</h2>
);
const CardDescription = ({ children }: any) => (
  <p style={{ fontSize: 13, color: '#6b7280', margin: '6px 0 0' }}>{children}</p>
);
const CardContent = ({ children }: any) => (
  <div style={{ padding: '20px 24px 24px' }}>{children}</div>
);
const Button = ({ children, disabled, ...props }: any) => (
  <button
    {...props}
    disabled={disabled}
    style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: 8,
      padding: '10px 14px',
      borderRadius: 10,
      fontSize: 14,
      border: '1px solid #e5e7eb',
      background: disabled ? '#f3f4f6' : 'white',
      color: disabled ? '#9ca3af' : '#111827',
      cursor: disabled ? 'not-allowed' : 'pointer',
    }}
  >
    {children}
  </button>
);

/* ---------------- helpers ---------------- */
const currency = (n: number | string) => {
  const num = typeof n === 'number' ? n : Number(String(n).replace(/[^0-9.]/g, '')) || 0;
  return num.toLocaleString(undefined, { maximumFractionDigits: 0 });
};

const parseMoneyToNumber = (val: string | number | null | undefined): number => {
  if (val == null) return 0;
  if (typeof val === 'number') return val;
  // turn "$500,000" into 500000; allow decimals just in case
  const cleaned = val.replace(/[^0-9.]/g, '');
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : 0;
};

// parse a label like "$25k - $45k" or "$5,000 - $15,000" -> lower bound number
const parseBudgetLowerBound = (label: string): number => {
  // capture first number with optional k/m
  const m = label.match(/([\d,.]+)\s*([kKmM]?)/);
  if (!m) return parseMoneyToNumber(label);
  const raw = m[1].replace(/[,]/g, '');
  const unit = (m[2] || '').toLowerCase();
  let n = Number(raw);
  if (!Number.isFinite(n)) return 0;
  if (unit === 'k') n *= 1_000;
  if (unit === 'm') n *= 1_000_000;
  return n;
};

const MAX_IMAGE_MB = 3;
const ALLOWED_IMAGE_MIMES = ['image/jpeg', 'image/png', 'image/webp'];

/* ---------------- page ---------------- */
export default function Page() {
  // form state
  const [zip, setZip] = useState('75022');
  const [address, setAddress] = useState('123 Main St, Flower Mound, TX 75022');
  const [homeValueDisplay, setHomeValueDisplay] = useState('$500,000');
  const [budgetLabel, setBudgetLabel] = useState('$25k - $45k');
  const [timeline, setTimeline] = useState('3 - 6 months');
  const [room, setRoom] = useState('Bathroom');

  const [photoBase64, setPhotoBase64] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [resultJson, setResultJson] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    if (!file) {
      setPhotoBase64(null);
      return;
    }
    if (!ALLOWED_IMAGE_MIMES.includes(file.type)) {
      alert(`Unsupported image type. Allowed: ${ALLOWED_IMAGE_MIMES.join(', ')}`);
      e.target.value = '';
      setPhotoBase64(null);
      return;
    }
    const mb = file.size / (1024 * 1024);
    if (mb > MAX_IMAGE_MB) {
      alert(`Image too large. Max ${MAX_IMAGE_MB} MB`);
      e.target.value = '';
      setPhotoBase64(null);
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = String(reader.result || '');
      setPhotoBase64(dataUrl);
    };
    reader.readAsDataURL(file);
  };

  const handleAnalyze = async () => {
    try {
      setLoading(true);
      setResultJson('');

      // normalize
      const zip5 = (zip.match(/\d/g) || []).join('').slice(0, 5);
      const homeValueNum = parseMoneyToNumber(homeValueDisplay);
      const budgetNum = parseBudgetLowerBound(budgetLabel);

      const payload = {
        zip: zip5,
        address: address?.trim() || '',
        homeValue: homeValueNum,
        budget: budgetNum,
        timeline,
        room,
        photoBase64: photoBase64 || null,
      };

      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const text = await res.text();
      if (!res.ok) {
        // try to show useful error details
        try {
          const err = JSON.parse(text);
          console.error('Analyze error:', err);
          alert(err?.error ? `Error: ${err.error}` : 'Something went wrong. Check the server logs.');
        } catch {
          console.error('Analyze error (raw):', text);
          alert('Something went wrong. Check the server logs.');
        }
        return;
      }

      // server returns structured JSON; pretty-print it
      const obj = JSON.parse(text);
      setResultJson(JSON.stringify(obj, null, 2));
    } catch (e) {
      console.error(e);
      alert('Something went wrong. Check the server logs.');
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = () => {
    const blob = new Blob([resultJson || ''], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'renoview-output.txt';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div style={{ background: '#fafafa', minHeight: '100vh' }}>
      <header style={{ borderBottom: '1px solid #eee', background: 'white' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontWeight: 600 }}>
            <Wand2 size={18} />
            Renoview
          </div>
          <span style={{ marginLeft: 8, fontSize: 12, padding: '2px 6px', border: '1px solid #e5e7eb', borderRadius: 999 }}>
            Prototype
          </span>
        </div>
      </header>

      <main style={{ maxWidth: 1100, margin: '0 auto', padding: '24px 16px 48px' }}>
        <h1 style={{ fontSize: 36, margin: 0, fontWeight: 800, letterSpacing: -0.5, textAlign: 'center' }}>
          Should I remodel before selling?
        </h1>
        <p style={{ textAlign: 'center', color: '#6b7280', marginTop: 6 }}>
          Enter your details. We send them to ChatGPT along with your optional photo. The response is shown exactly as returned.
        </p>

        <section style={{ marginTop: 24 }}>
          <Card>
            <CardHeader>
              <CardTitle>Analysis</CardTitle>
              <CardDescription>Enter property details (photo optional)</CardDescription>
            </CardHeader>
            <CardContent>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ fontSize: 12, color: '#6b7280' }}>ZIP</label>
                  <input
                    value={zip}
                    onChange={(e) => setZip(e.target.value)}
                    placeholder="75028"
                    style={{ width: '100%', marginTop: 6, padding: 10, border: '1px solid #e5e7eb', borderRadius: 10 }}
                  />
                </div>

                <div style={{ gridColumn: 'span 2' }}>
                  <label style={{ fontSize: 12, color: '#6b7280' }}>Address (optional)</label>
                  <input
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="123 Main St, City, ST 75028"
                    style={{ width: '100%', marginTop: 6, padding: 10, border: '1px solid #e5e7eb', borderRadius: 10 }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: 12, color: '#6b7280' }}>Home value</label>
                  <input
                    value={homeValueDisplay}
                    onChange={(e) => setHomeValueDisplay(e.target.value)}
                    placeholder="$500,000"
                    style={{ width: '100%', marginTop: 6, padding: 10, border: '1px solid #e5e7eb', borderRadius: 10 }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: 12, color: '#6b7280' }}>Budget</label>
                  <select
                    value={budgetLabel}
                    onChange={(e) => setBudgetLabel(e.target.value)}
                    style={{ width: '100%', marginTop: 6, padding: 10, border: '1px solid #e5e7eb', borderRadius: 10, background: 'white' }}
                  >
                    <option>$5k - $15k</option>
                    <option>$15k - $25k</option>
                    <option>$25k - $45k</option>
                    <option>$45k - $75k</option>
                    <option>$75k - $125k</option>
                    <option>$125k - $200k</option>
                  </select>
                </div>

                <div>
                  <label style={{ fontSize: 12, color: '#6b7280' }}>Timeline to sell</label>
                  <select
                    value={timeline}
                    onChange={(e) => setTimeline(e.target.value)}
                    style={{ width: '100%', marginTop: 6, padding: 10, border: '1px solid #e5e7eb', borderRadius: 10, background: 'white' }}
                  >
                    <option>2 - 4 weeks</option>
                    <option>4 - 6 weeks</option>
                    <option>6 - 8 weeks</option>
                    <option>2 - 3 months</option>
                    <option>3 - 6 months</option>
                    <option>6+ months</option>
                  </select>
                </div>

                <div>
                  <label style={{ fontSize: 12, color: '#6b7280' }}>Room</label>
                  <select
                    value={room}
                    onChange={(e) => setRoom(e.target.value)}
                    style={{ width: '100%', marginTop: 6, padding: 10, border: '1px solid #e5e7eb', borderRadius: 10, background: 'white' }}
                  >
                    <option>Kitchen</option>
                    <option>Bathroom</option>
                    <option>Exterior</option>
                    <option>Whole-home</option>
                    <option>Other</option>
                  </select>
                </div>

                <div style={{ gridColumn: 'span 3' }}>
                  <label style={{ fontSize: 12, color: '#6b7280' }}>
                    Upload a photo (optional - kitchen, bathroom, or exterior)
                  </label>
                  <div style={{ marginTop: 6, display: 'flex', alignItems: 'center', gap: 8 }}>
                    <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp" onChange={handleFileChange} />
                    {photoBase64 && (
                      <span style={{ fontSize: 12, color: '#6b7280' }}>Attached ✓</span>
                    )}
                  </div>
                </div>
              </div>

              <div style={{ marginTop: 16 }}>
                <Button onClick={handleAnalyze} disabled={loading}>
                  <Sparkles size={16} />
                  {loading ? 'Analyzing...' : 'Analyze'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </section>

        <section style={{ marginTop: 24 }}>
          <Card>
            <CardHeader>
              <CardTitle>Result</CardTitle>
              <CardDescription>Server returns structured JSON</CardDescription>
            </CardHeader>
            <CardContent>
              {resultJson ? (() => {
                const r = JSON.parse(resultJson);
                return (
                  <div>
                    <p style={{marginTop:0}}>{r.summary}</p>

                    <h4>Priority actions</h4>
                    <ul>
                      {r.priority_actions.map((a:any, i:number)=>(
                        <li key={i}>
                          <strong>{a.title}</strong> — ${a.est_cost_range[0].toLocaleString()} - ${a.est_cost_range[1].toLocaleString()}
                          {a.roi_range_pct && ` (ROI ${a.roi_range_pct[0]}%-${a.roi_range_pct[1]}%)`}
                        </li>
                      ))}
                    </ul>

                    <h4>Quick wins</h4>
                    <ul>
                      {r.quick_wins.map((q:any, i:number)=>(
                        <li key={i}>{q.title} — ${q.est_cost.toLocaleString()}</li>
                      ))}
                    </ul>
                  </div>
                );
              })() : (
                <pre style={{margin:0,whiteSpace:'pre-wrap',fontSize:13,lineHeight:1.5,background:'#0b1021',color:'#d1d5db',padding:16,borderRadius:12,maxHeight:420,overflow:'auto'}}>
                  // Run an analysis to see results here…
                </pre>
              )}
              <div style={{ marginTop: 12 }}>
                <Button onClick={handleDownload} disabled={!resultJson}>
                  <FileDown size={16} /> Download TXT
                </Button>
              </div>
            </CardContent>
          </Card>
        </section>
      </main>

      <footer style={{ borderTop: '1px solid #eee', background: 'white' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', padding: '18px 16px', fontSize: 13, color: '#525252' }}>
          <p style={{ margin: 0 }}>
            We do not sell photos or addresses. This tool provides planning ranges - not a contractor quote.
          </p>
          <p>© {new Date().getFullYear()} Renoview.</p>
        </div>
      </footer>
    </div>
  );
}
