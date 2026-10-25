import React, { useState, useRef, useEffect } from "react";
import {
  FileText,
  Video,
  Image as ImageIcon,
  Plus,
  Trash2,
  Download,
  Printer,
  Copy,
  CheckCircle,
  Clock,
  Sparkles,
  Building,
  User,
  CreditCard,
  DollarSign,
  Percent,
  RefreshCw,
} from "lucide-react";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import confetti from "canvas-confetti";

export default function App() {
  // Persistence in local storage
  const [currency, setCurrency] = useState(() => localStorage.getItem("inv_curr") || "₹");
  
  // Freelancer / Editor details
  const [editor, setEditor] = useState(() => {
    const saved = localStorage.getItem("inv_editor");
    return saved ? JSON.parse(saved) : {
      name: "Alex Rivera",
      tagline: "Creative Video Editor & Graphic Designer",
      email: "alex.editor@creatives.io",
      phone: "+91 98765 43210",
      upiId: "alex.editor@okhdfcbank",
      bankDetails: "HDFC Bank | A/C: 50100492817291 | IFSC: HDFC0000240",
      address: "Studio 402, Creator Hub, Bangalore",
    };
  });

  // Client / Startup details
  const [client, setClient] = useState(() => {
    const saved = localStorage.getItem("inv_client");
    return saved ? JSON.parse(saved) : {
      companyName: "Nexus Digital Dynamics Pvt Ltd",
      contactPerson: "Rohan Varma (Founder)",
      email: "accounts@nexusdigital.io",
      address: "Tech Park Phase II, Outer Ring Road, Bangalore",
      gstOrTaxId: "29AABCU9603R1ZM",
    };
  });

  // Invoice meta
  const [invoiceMeta, setInvoiceMeta] = useState(() => {
    const today = new Date().toISOString().split("T")[0];
    const dueDate = new Date(Date.now() + 14 * 86400000).toISOString().split("T")[0];
    return {
      invoiceNumber: "INV-" + Math.floor(1000 + Math.random() * 9000),
      issueDate: today,
      dueDate: dueDate,
      status: "DRAFT / UNPAID",
      paymentTerms: "Due on receipt / 14 Days",
      notes: "Thank you for the collaboration! Please transfer the billed amount to the specified bank or UPI handle with invoice number as reference.",
    };
  });

  // Line items
  const [items, setItems] = useState([
    {
      id: "1",
      type: "video", // "video" or "poster" or "fixed"
      title: "Hero Product Launch Reel / Teaser",
      description: "Color grading, sound design, animated motion typography & 4K delivery",
      // Video timeline parameters:
      timeMode: "minutes", // "minutes", "seconds", "hours", "duration_raw"
      durationVal: 90, // e.g. 90 seconds
      ratePerUnit: 25, // e.g. ₹25 per second => ₹2,250
      rateUnitLabel: "second", 
      fixedAmount: 2250,
      total: 2250,
    },
    {
      id: "2",
      type: "video",
      title: "Founder Story & Startup Pitch Video",
      description: "Multicam editing, audio cleanup, B-roll pacing, cinematic subtitles (3.5 mins)",
      timeMode: "minutes",
      durationVal: 3.5, // 3.5 minutes
      ratePerUnit: 1200, // ₹1,200 per minute => ₹4,200
      rateUnitLabel: "minute",
      fixedAmount: 4200,
      total: 4200,
    },
    {
      id: "3",
      type: "poster",
      title: "Social Media Campaign Posters & Thumbnails",
      description: "3x high-converting Instagram square & story banners + YouTube thumbnail",
      quantity: 4,
      ratePerUnit: 600, // ₹600 per poster => ₹2,400
      rateUnitLabel: "poster",
      total: 2400,
    },
  ]);

  // Tax and Discount
  const [taxPercent, setTaxPercent] = useState(0); // 0 or 18% GST etc.
  const [discountPercent, setDiscountPercent] = useState(0);
  const [copiedLink, setCopiedLink] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  const invoiceRef = useRef(null);

  // Auto-save
  useEffect(() => {
    localStorage.setItem("inv_curr", currency);
    localStorage.setItem("inv_editor", JSON.stringify(editor));
    localStorage.setItem("inv_client", JSON.stringify(client));
  }, [currency, editor, client]);

  // Calculations
  const calculateItemTotal = (item) => {
    if (item.type === "video") {
      const units = Number(item.durationVal) || 0;
      const rate = Number(item.ratePerUnit) || 0;
      return Math.round(units * rate);
    } else if (item.type === "poster") {
      const qty = Number(item.quantity) || 0;
      const rate = Number(item.ratePerUnit) || 0;
      return Math.round(qty * rate);
    } else {
      return Number(item.fixedAmount) || 0;
    }
  };

  const updateItem = (id, field, value) => {
    setItems((prev) =>
      prev.map((it) => {
        if (it.id === id) {
          const updated = { ...it, [field]: value };
          // If changing duration, quantity or rate, recalculate total
          if (["durationVal", "ratePerUnit", "quantity", "fixedAmount", "type", "timeMode"].includes(field)) {
            if (field === "timeMode") {
              updated.rateUnitLabel = value === "seconds" ? "second" : value === "minutes" ? "minute" : "hour";
            }
            updated.total = calculateItemTotal(updated);
          }
          return updated;
        }
        return it;
      })
    );
  };

  const addItem = (type = "video") => {
    const newItem = {
      id: Date.now().toString(),
      type: type,
      title: type === "video" ? "Brand Promo Video (Timeline based)" : "Brand Banner / Poster",
      description: type === "video" ? "Footage curation, pacing, transitions, sound fx" : "Visual design, layout, asset export",
      timeMode: "minutes",
      durationVal: type === "video" ? 2 : 1,
      ratePerUnit: type === "video" ? 1000 : 500,
      rateUnitLabel: type === "video" ? "minute" : "poster",
      quantity: 1,
      total: type === "video" ? 2000 : 500,
    };
    setItems([...items, newItem]);
  };

  const removeItem = (id) => {
    setItems(items.filter((it) => it.id !== id));
  };

  const subtotal = items.reduce((sum, it) => sum + (Number(it.total) || 0), 0);
  const discountAmount = Math.round((subtotal * discountPercent) / 100);
  const taxableAmount = subtotal - discountAmount;
  const taxAmount = Math.round((taxableAmount * taxPercent) / 100);
  const grandTotal = taxableAmount + taxAmount;

  // Total video duration calculation helper
  const totalVideoMinutes = items
    .filter((it) => it.type === "video")
    .reduce((acc, it) => {
      const dur = Number(it.durationVal) || 0;
      if (it.timeMode === "seconds") return acc + dur / 60;
      if (it.timeMode === "hours") return acc + dur * 60;
      return acc + dur;
    }, 0);

  // PDF Export
  const handleDownloadPDF = async () => {
    if (!invoiceRef.current) return;
    setIsExporting(true);
    try {
      const canvas = await html2canvas(invoiceRef.current, {
        scale: 2,
        useCORS: true,
        backgroundColor: "#ffffff",
      });
      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF("p", "mm", "a4");
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      
      pdf.addImage(imgData, "PNG", 0, 0, pdfWidth, pdfHeight);
      pdf.save(`${invoiceMeta.invoiceNumber}_${client.companyName.replace(/\s+/g, "_")}.pdf`);
      
      confetti({
        particleCount: 80,
        spread: 60,
        origin: { y: 0.8 },
      });
    } catch (e) {
      console.error(e);
      window.print();
    } finally {
      setIsExporting(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", minHeight: "100vh" }}>
      {/* Top Header Bar */}
      <header
        className="no-print"
        style={{
          backgroundColor: "#161922",
          borderBottom: "1px solid #232936",
          padding: "16px 24px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: "12px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <div
            style={{
              width: "40px",
              height: "40px",
              borderRadius: "10px",
              background: "linear-gradient(135deg, #6366f1 0%, #a855f7 100%)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "0 4px 12px rgba(99, 102, 241, 0.3)",
            }}
          >
            <Video size={22} color="#ffffff" />
          </div>
          <div>
            <h1 style={{ fontSize: "18px", fontWeight: "700", color: "#f8fafc", margin: 0 }}>
              EditBill Studio <span style={{ fontSize: "12px", background: "#312e81", color: "#a5b4fc", padding: "2px 8px", borderRadius: "20px", marginLeft: "6px" }}>Pro Invoice</span>
            </h1>
            <p style={{ fontSize: "12px", color: "#94a3b8", margin: 0 }}>
              Tailored for Freelance Video Editors & Designers billing Startups
            </p>
          </div>
        </div>

        {/* Currency & Actions */}
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <div style={{ display: "flex", alignItems: "center", background: "#1f2430", borderRadius: "8px", padding: "4px 8px", border: "1px solid #2e3649" }}>
            <span style={{ fontSize: "13px", color: "#94a3b8", marginRight: "6px" }}>Currency:</span>
            <select
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
              style={{ background: "transparent", color: "#fff", border: "none", outline: "none", fontWeight: "600", cursor: "pointer" }}
            >
              <option value="₹">₹ INR (India)</option>
              <option value="$">$ USD</option>
              <option value="€">€ EUR</option>
              <option value="£">£ GBP</option>
              <option value="AED">AED (UAE)</option>
            </select>
          </div>

          <button
            onClick={handlePrint}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              background: "#242a38",
              color: "#e2e8f0",
              border: "1px solid #333d52",
              padding: "8px 14px",
              borderRadius: "8px",
              cursor: "pointer",
              fontSize: "13px",
              fontWeight: "500",
            }}
          >
            <Printer size={16} /> Print
          </button>

          <button
            onClick={handleDownloadPDF}
            disabled={isExporting}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              background: "linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)",
              color: "#ffffff",
              border: "none",
              padding: "8px 18px",
              borderRadius: "8px",
              cursor: "pointer",
              fontSize: "13px",
              fontWeight: "600",
              boxShadow: "0 2px 10px rgba(99, 102, 241, 0.4)",
            }}
          >
            <Download size={16} /> {isExporting ? "Generating PDF..." : "Export Clean PDF"}
          </button>
        </div>
      </header>

      {/* Main Container - Split View (Editor Form on Left, Live Clean Bill on Right) */}
      <main
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1.05fr",
          gap: "24px",
          padding: "24px",
          maxWidth: "1680px",
          margin: "0 auto",
          width: "100%",
          flex: 1,
        }}
      >
        {/* ================= LEFT COLUMN: CONTROL & INPUT PANEL ================= */}
        <section
          className="no-print"
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "20px",
          }}
        >
          {/* Editor Info Card */}
          <div style={cardStyle}>
            <div style={cardHeaderStyle}>
              <User size={18} color="#818cf8" />
              <h2 style={cardTitleStyle}>Your Freelancer / Agency Profile</h2>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
              <div>
                <label style={labelStyle}>Your Name / Studio</label>
                <input
                  type="text"
                  value={editor.name}
                  onChange={(e) => setEditor({ ...editor, name: e.target.value })}
                  style={inputStyle}
                  placeholder="e.g. Alex Rivera"
                />
              </div>
              <div>
                <label style={labelStyle}>Role / Tagline</label>
                <input
                  type="text"
                  value={editor.tagline}
                  onChange={(e) => setEditor({ ...editor, tagline: e.target.value })}
                  style={inputStyle}
                  placeholder="e.g. Video Editor & Motion Designer"
                />
              </div>
              <div>
                <label style={labelStyle}>Email</label>
                <input
                  type="text"
                  value={editor.email}
                  onChange={(e) => setEditor({ ...editor, email: e.target.value })}
                  style={inputStyle}
                />
              </div>
              <div>
                <label style={labelStyle}>Phone Number</label>
                <input
                  type="text"
                  value={editor.phone}
                  onChange={(e) => setEditor({ ...editor, phone: e.target.value })}
                  style={inputStyle}
                />
              </div>
              <div>
                <label style={labelStyle}>UPI ID (for quick QR/Scan transfer)</label>
                <input
                  type="text"
                  value={editor.upiId}
                  onChange={(e) => setEditor({ ...editor, upiId: e.target.value })}
                  style={inputStyle}
                  placeholder="name@okhdfcbank"
                />
              </div>
              <div>
                <label style={labelStyle}>Bank Details (A/C & IFSC for Company NEFT/IMPS)</label>
                <input
                  type="text"
                  value={editor.bankDetails}
                  onChange={(e) => setEditor({ ...editor, bankDetails: e.target.value })}
                  style={inputStyle}
                  placeholder="Bank name, Acc No, IFSC code"
                />
              </div>
            </div>
          </div>

          {/* Client / Startup Info Card */}
          <div style={cardStyle}>
            <div style={cardHeaderStyle}>
              <Building size={18} color="#38bdf8" />
              <h2 style={cardTitleStyle}>Cousin's Startup / Company Details (Billed To)</h2>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
              <div style={{ gridColumn: "span 2" }}>
                <label style={labelStyle}>Startup / Company Legal Name</label>
                <input
                  type="text"
                  value={client.companyName}
                  onChange={(e) => setClient({ ...client, companyName: e.target.value })}
                  style={inputStyle}
                  placeholder="e.g. Nexus Digital Dynamics Pvt Ltd"
                />
              </div>
              <div>
                <label style={labelStyle}>Contact Person</label>
                <input
                  type="text"
                  value={client.contactPerson}
                  onChange={(e) => setClient({ ...client, contactPerson: e.target.value })}
                  style={inputStyle}
                  placeholder="e.g. Rohan Varma (Founder / Marketing Lead)"
                />
              </div>
              <div>
                <label style={labelStyle}>Company GSTIN / Tax ID (if applicable)</label>
                <input
                  type="text"
                  value={client.gstOrTaxId}
                  onChange={(e) => setClient({ ...client, gstOrTaxId: e.target.value })}
                  style={inputStyle}
                  placeholder="GSTIN for their startup accounting"
                />
              </div>
              <div style={{ gridColumn: "span 2" }}>
                <label style={labelStyle}>Company Registered Address</label>
                <input
                  type="text"
                  value={client.address}
                  onChange={(e) => setClient({ ...client, address: e.target.value })}
                  style={inputStyle}
                  placeholder="e.g. Suite 201, Innovation Hub, Tech City"
                />
              </div>
            </div>
          </div>

          {/* Bill Meta Card */}
          <div style={cardStyle}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "12px" }}>
              <div>
                <label style={labelStyle}>Invoice #</label>
                <input
                  type="text"
                  value={invoiceMeta.invoiceNumber}
                  onChange={(e) => setInvoiceMeta({ ...invoiceMeta, invoiceNumber: e.target.value })}
                  style={inputStyle}
                />
              </div>
              <div>
                <label style={labelStyle}>Invoice Date</label>
                <input
                  type="date"
                  value={invoiceMeta.issueDate}
                  onChange={(e) => setInvoiceMeta({ ...invoiceMeta, issueDate: e.target.value })}
                  style={inputStyle}
                />
              </div>
              <div>
                <label style={labelStyle}>Due Date</label>
                <input
                  type="date"
                  value={invoiceMeta.dueDate}
                  onChange={(e) => setInvoiceMeta({ ...invoiceMeta, dueDate: e.target.value })}
                  style={inputStyle}
                />
              </div>
            </div>
          </div>

          {/* Video Timeline & Poster Line Items Manager */}
          <div style={cardStyle}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <Video size={18} color="#a855f7" />
                <h2 style={cardTitleStyle}>Editing Works & Video Timeline Rate Calculator</h2>
              </div>
              <div style={{ display: "flex", gap: "8px" }}>
                <button
                  onClick={() => addItem("video")}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                    background: "#2e1065",
                    color: "#d8b4fe",
                    border: "1px solid #581c87",
                    borderRadius: "6px",
                    padding: "6px 12px",
                    fontSize: "12px",
                    fontWeight: "600",
                    cursor: "pointer",
                  }}
                >
                  <Plus size={14} /> + Video (Timeline Rate)
                </button>
                <button
                  onClick={() => addItem("poster")}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                    background: "#0c4a6e",
                    color: "#7dd3fc",
                    border: "1px solid #0369a1",
                    borderRadius: "6px",
                    padding: "6px 12px",
                    fontSize: "12px",
                    fontWeight: "600",
                    cursor: "pointer",
                  }}
                >
                  <Plus size={14} /> + Poster / Graphic
                </button>
              </div>
            </div>

            {/* List of Editable Items */}
            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              {items.map((item, index) => (
                <div
                  key={item.id}
                  style={{
                    background: item.type === "video" ? "#191c28" : "#1a222f",
                    border: item.type === "video" ? "1px solid #3730a3" : "1px solid #1e40af",
                    borderRadius: "10px",
                    padding: "16px",
                    position: "relative",
                  }}
                >
                  {/* Badge */}
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
                    <span
                      style={{
                        fontSize: "11px",
                        fontWeight: "700",
                        letterSpacing: "0.5px",
                        textTransform: "uppercase",
                        padding: "3px 8px",
                        borderRadius: "4px",
                        background: item.type === "video" ? "#4338ca" : "#0284c7",
                        color: "#fff",
                        display: "flex",
                        alignItems: "center",
                        gap: "4px",
                      }}
                    >
                      {item.type === "video" ? <Video size={12} /> : <ImageIcon size={12} />}
                      {item.type === "video" ? "Video Timeline Item" : "Poster / Graphic Item"}
                    </span>
                    <button
                      onClick={() => removeItem(item.id)}
                      title="Remove item"
                      style={{
                        background: "transparent",
                        border: "none",
                        color: "#f87171",
                        cursor: "pointer",
                        padding: "4px",
                      }}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: "12px", marginBottom: "12px" }}>
                    <div>
                      <label style={labelStyle}>Project / Video Title</label>
                      <input
                        type="text"
                        value={item.title}
                        onChange={(e) => updateItem(item.id, "title", e.target.value)}
                        style={inputStyle}
                        placeholder="e.g. 60-Sec Instagram Ad Reel"
                      />
                    </div>
                    <div>
                      <label style={labelStyle}>Service Type</label>
                      <select
                        value={item.type}
                        onChange={(e) => updateItem(item.id, "type", e.target.value)}
                        style={inputStyle}
                      >
                        <option value="video">🎬 Video Editing</option>
                        <option value="poster">🎨 Poster / Banner</option>
                        <option value="fixed">⚡ Fixed Project</option>
                      </select>
                    </div>
                  </div>

                  <div style={{ marginBottom: "12px" }}>
                    <label style={labelStyle}>Scope / Edit Description</label>
                    <input
                      type="text"
                      value={item.description}
                      onChange={(e) => updateItem(item.id, "description", e.target.value)}
                      style={inputStyle}
                      placeholder="e.g. Sound design, pacing, 4K rendering, color grading"
                    />
                  </div>

                  {/* Video Timeline Calculator Row */}
                  {item.type === "video" && (
                    <div
                      style={{
                        background: "#13151f",
                        padding: "12px",
                        borderRadius: "8px",
                        border: "1px dashed #4338ca",
                        display: "grid",
                        gridTemplateColumns: "1.2fr 1fr 1.2fr 1fr",
                        gap: "10px",
                        alignItems: "center",
                      }}
                    >
                      <div>
                        <label style={{ ...labelStyle, color: "#a5b4fc" }}>Timeline Unit</label>
                        <select
                          value={item.timeMode || "minutes"}
                          onChange={(e) => updateItem(item.id, "timeMode", e.target.value)}
                          style={{ ...inputStyle, background: "#1c2030" }}
                        >
                          <option value="minutes">Minutes (e.g. 2.5 min)</option>
                          <option value="seconds">Seconds (e.g. 45 sec)</option>
                          <option value="hours">Hours (Raw Footage)</option>
                        </select>
                      </div>

                      <div>
                        <label style={{ ...labelStyle, color: "#a5b4fc" }}>
                          Timeline Length ({item.timeMode === "seconds" ? "Secs" : item.timeMode === "hours" ? "Hrs" : "Mins"})
                        </label>
                        <input
                          type="number"
                          step="any"
                          value={item.durationVal}
                          onChange={(e) => updateItem(item.id, "durationVal", e.target.value)}
                          style={{ ...inputStyle, background: "#1c2030", fontWeight: "bold", color: "#38bdf8" }}
                        />
                      </div>

                      <div>
                        <label style={{ ...labelStyle, color: "#a5b4fc" }}>
                          Rate ({currency} / {item.rateUnitLabel || "unit"})
                        </label>
                        <input
                          type="number"
                          value={item.ratePerUnit}
                          onChange={(e) => updateItem(item.id, "ratePerUnit", e.target.value)}
                          style={{ ...inputStyle, background: "#1c2030" }}
                        />
                      </div>

                      <div>
                        <label style={{ ...labelStyle, color: "#a5b4fc" }}>Calculated Cost</label>
                        <div
                          style={{
                            padding: "8px 12px",
                            background: "#222a3d",
                            borderRadius: "6px",
                            fontWeight: "700",
                            color: "#34d399",
                            fontSize: "14px",
                          }}
                        >
                          {currency} {item.total?.toLocaleString()}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Poster Graphic Row */}
                  {item.type === "poster" && (
                    <div
                      style={{
                        background: "#13151f",
                        padding: "12px",
                        borderRadius: "8px",
                        border: "1px dashed #0284c7",
                        display: "grid",
                        gridTemplateColumns: "1fr 1fr 1fr",
                        gap: "10px",
                        alignItems: "center",
                      }}
                    >
                      <div>
                        <label style={{ ...labelStyle, color: "#7dd3fc" }}>Quantity (Posters/Creatives)</label>
                        <input
                          type="number"
                          min="1"
                          value={item.quantity}
                          onChange={(e) => updateItem(item.id, "quantity", e.target.value)}
                          style={{ ...inputStyle, background: "#1c2030" }}
                        />
                      </div>

                      <div>
                        <label style={{ ...labelStyle, color: "#7dd3fc" }}>Rate per Poster ({currency})</label>
                        <input
                          type="number"
                          value={item.ratePerUnit}
                          onChange={(e) => updateItem(item.id, "ratePerUnit", e.target.value)}
                          style={{ ...inputStyle, background: "#1c2030" }}
                        />
                      </div>

                      <div>
                        <label style={{ ...labelStyle, color: "#7dd3fc" }}>Sub-total</label>
                        <div
                          style={{
                            padding: "8px 12px",
                            background: "#222a3d",
                            borderRadius: "6px",
                            fontWeight: "700",
                            color: "#34d399",
                            fontSize: "14px",
                          }}
                        >
                          {currency} {item.total?.toLocaleString()}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Fixed Amount */}
                  {item.type === "fixed" && (
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                      <div>
                        <label style={labelStyle}>Fixed Service Fee ({currency})</label>
                        <input
                          type="number"
                          value={item.fixedAmount}
                          onChange={(e) => updateItem(item.id, "fixedAmount", e.target.value)}
                          style={inputStyle}
                        />
                      </div>
                      <div>
                        <label style={labelStyle}>Total</label>
                        <div
                          style={{
                            padding: "8px 12px",
                            background: "#222a3d",
                            borderRadius: "6px",
                            fontWeight: "700",
                            color: "#34d399",
                            fontSize: "14px",
                            marginTop: "2px",
                          }}
                        >
                          {currency} {item.total?.toLocaleString()}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Discount & Tax Options */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px", marginTop: "16px" }}>
              <div>
                <label style={labelStyle}>Discount (%)</label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={discountPercent}
                  onChange={(e) => setDiscountPercent(Number(e.target.value))}
                  style={inputStyle}
                  placeholder="0"
                />
              </div>
              <div>
                <label style={labelStyle}>GST / Tax Rate (%)</label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={taxPercent}
                  onChange={(e) => setTaxPercent(Number(e.target.value))}
                  style={inputStyle}
                  placeholder="e.g. 18 for GST or 0"
                />
              </div>
            </div>
          </div>
        </section>

        {/* ================= RIGHT COLUMN: LIVE MINIMAL A4 INVOICE PREVIEW ================= */}
        <section
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
          }}
        >
          {/* Header indicator */}
          <div
            className="no-print"
            style={{
              width: "100%",
              maxWidth: "800px",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "12px",
              padding: "0 4px",
            }}
          >
            <span style={{ fontSize: "13px", color: "#94a3b8", display: "flex", alignItems: "center", gap: "6px" }}>
              <Sparkles size={14} color="#38bdf8" /> Live Startup Ready Preview (Exact Print/PDF Render)
            </span>
            <span style={{ fontSize: "12px", color: "#64748b" }}>
              Video Timeline: ~{totalVideoMinutes.toFixed(1)} mins total
            </span>
          </div>

          {/* White Paper Sheet */}
          <div
            ref={invoiceRef}
            className="invoice-sheet"
            style={{
              backgroundColor: "#ffffff",
              color: "#1e293b",
              width: "100%",
              maxWidth: "800px",
              minHeight: "1050px",
              padding: "48px 48px",
              borderRadius: "12px",
              boxShadow: "0 20px 40px -15px rgba(0,0,0,0.5)",
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
              fontFamily: "Inter, -apple-system, BlinkMacSystemFont, sans-serif",
            }}
          >
            <div>
              {/* Invoice Header */}
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "flex-start",
                  borderBottom: "2px solid #f1f5f9",
                  paddingBottom: "28px",
                  marginBottom: "28px",
                }}
              >
                <div>
                  <h1
                    style={{
                      fontSize: "26px",
                      fontWeight: "800",
                      letterSpacing: "-0.5px",
                      color: "#0f172a",
                      margin: "0 0 4px 0",
                    }}
                  >
                    {editor.name || "Freelancer Name"}
                  </h1>
                  <p style={{ fontSize: "13px", color: "#6366f1", fontWeight: "600", margin: "0 0 8px 0" }}>
                    {editor.tagline || "Creative Editor & Designer"}
                  </p>
                  <p style={{ fontSize: "12px", color: "#64748b", margin: "0", lineHeight: "1.5" }}>
                    {editor.email} {editor.phone && `• ${editor.phone}`}
                    <br />
                    {editor.address}
                  </p>
                </div>

                <div style={{ textAlign: "right" }}>
                  <div
                    style={{
                      fontSize: "26px",
                      fontWeight: "900",
                      letterSpacing: "1px",
                      color: "#0f172a",
                      textTransform: "uppercase",
                    }}
                  >
                    INVOICE
                  </div>
                  <div style={{ fontSize: "13px", fontWeight: "700", color: "#475569", marginTop: "2px" }}>
                    #{invoiceMeta.invoiceNumber}
                  </div>
                  <div
                    style={{
                      display: "inline-block",
                      marginTop: "6px",
                      padding: "3px 10px",
                      borderRadius: "12px",
                      fontSize: "11px",
                      fontWeight: "700",
                      background: "#f0fdf4",
                      color: "#166534",
                      border: "1px solid #bbf7d0",
                    }}
                  >
                    OFFICIAL BILL FOR REIMBURSEMENT
                  </div>
                </div>
              </div>

              {/* Billed To & Dates Row */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1.4fr 1fr",
                  gap: "24px",
                  marginBottom: "32px",
                  background: "#f8fafc",
                  padding: "18px 20px",
                  borderRadius: "8px",
                  border: "1px solid #e2e8f0",
                }}
              >
                <div>
                  <span style={{ fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.5px", fontWeight: "700", color: "#64748b" }}>
                    Billed To (Company / Startup):
                  </span>
                  <div style={{ fontSize: "16px", fontWeight: "800", color: "#0f172a", marginTop: "4px" }}>
                    {client.companyName || "Client Company Name"}
                  </div>
                  {client.contactPerson && (
                    <div style={{ fontSize: "13px", color: "#334155", fontWeight: "500", marginTop: "2px" }}>
                      Attn: {client.contactPerson}
                    </div>
                  )}
                  {client.gstOrTaxId && (
                    <div style={{ fontSize: "12px", color: "#64748b", marginTop: "2px" }}>
                      GSTIN/Tax ID: <strong>{client.gstOrTaxId}</strong>
                    </div>
                  )}
                  {client.address && (
                    <div style={{ fontSize: "12px", color: "#64748b", marginTop: "4px", lineHeight: "1.4" }}>
                      {client.address}
                    </div>
                  )}
                </div>

                <div style={{ textAlign: "right", display: "flex", flexDirection: "column", gap: "6px" }}>
                  <div>
                    <span style={{ fontSize: "11px", color: "#64748b", textTransform: "uppercase", fontWeight: "600" }}>Issue Date: </span>
                    <strong style={{ fontSize: "13px", color: "#1e293b" }}>{invoiceMeta.issueDate}</strong>
                  </div>
                  <div>
                    <span style={{ fontSize: "11px", color: "#64748b", textTransform: "uppercase", fontWeight: "600" }}>Payment Due: </span>
                    <strong style={{ fontSize: "13px", color: "#dc2626" }}>{invoiceMeta.dueDate}</strong>
                  </div>
                  <div>
                    <span style={{ fontSize: "11px", color: "#64748b", textTransform: "uppercase", fontWeight: "600" }}>Payment Terms: </span>
                    <span style={{ fontSize: "12px", color: "#334155" }}>{invoiceMeta.paymentTerms}</span>
                  </div>
                </div>
              </div>

              {/* Items Table */}
              <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: "28px" }}>
                <thead>
                  <tr style={{ borderBottom: "2px solid #cbd5e1", textAlign: "left" }}>
                    <th style={{ padding: "10px 8px", fontSize: "11px", textTransform: "uppercase", color: "#475569", fontWeight: "700", width: "45%" }}>
                      Item / Deliverable Description
                    </th>
                    <th style={{ padding: "10px 8px", fontSize: "11px", textTransform: "uppercase", color: "#475569", fontWeight: "700", textAlign: "center" }}>
                      Type
                    </th>
                    <th style={{ padding: "10px 8px", fontSize: "11px", textTransform: "uppercase", color: "#475569", fontWeight: "700", textAlign: "center" }}>
                      Timeline / Qty
                    </th>
                    <th style={{ padding: "10px 8px", fontSize: "11px", textTransform: "uppercase", color: "#475569", fontWeight: "700", textAlign: "right" }}>
                      Rate
                    </th>
                    <th style={{ padding: "10px 8px", fontSize: "11px", textTransform: "uppercase", color: "#475569", fontWeight: "700", textAlign: "right" }}>
                      Amount ({currency})
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item, idx) => (
                    <tr key={item.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                      <td style={{ padding: "14px 8px", verticalAlign: "top" }}>
                        <div style={{ fontWeight: "700", fontSize: "14px", color: "#0f172a" }}>
                          {item.title}
                        </div>
                        {item.description && (
                          <div style={{ fontSize: "12px", color: "#64748b", marginTop: "3px", lineHeight: "1.4" }}>
                            {item.description}
                          </div>
                        )}
                      </td>
                      <td style={{ padding: "14px 8px", textAlign: "center", verticalAlign: "top" }}>
                        <span
                          style={{
                            fontSize: "11px",
                            padding: "2px 8px",
                            borderRadius: "4px",
                            background: item.type === "video" ? "#e0e7ff" : item.type === "poster" ? "#e0f2fe" : "#f1f5f9",
                            color: item.type === "video" ? "#3730a3" : item.type === "poster" ? "#0369a1" : "#334155",
                            fontWeight: "600",
                          }}
                        >
                          {item.type === "video" ? "Video Timeline" : item.type === "poster" ? "Graphic" : "Project"}
                        </span>
                      </td>
                      <td style={{ padding: "14px 8px", textAlign: "center", verticalAlign: "top", fontSize: "13px", color: "#1e293b" }}>
                        {item.type === "video" ? (
                          <div>
                            <strong>{item.durationVal}</strong> {item.timeMode}
                          </div>
                        ) : item.type === "poster" ? (
                          <div>
                            <strong>{item.quantity}</strong> units
                          </div>
                        ) : (
                          "1 Project"
                        )}
                      </td>
                      <td style={{ padding: "14px 8px", textAlign: "right", verticalAlign: "top", fontSize: "13px", color: "#334155" }}>
                        {currency}
                        {Number(item.ratePerUnit || item.fixedAmount).toLocaleString()}
                        {item.type === "video" ? `/${item.rateUnitLabel || "unit"}` : item.type === "poster" ? "/poster" : ""}
                      </td>
                      <td style={{ padding: "14px 8px", textAlign: "right", verticalAlign: "top", fontWeight: "700", fontSize: "14px", color: "#0f172a" }}>
                        {currency}
                        {Number(item.total).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Totals Section */}
              <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: "32px" }}>
                <div style={{ width: "280px", display: "flex", flexDirection: "column", gap: "8px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "13px", color: "#64748b" }}>
                    <span>Subtotal:</span>
                    <strong style={{ color: "#1e293b" }}>{currency} {subtotal.toLocaleString()}</strong>
                  </div>

                  {discountPercent > 0 && (
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: "13px", color: "#16a34a" }}>
                      <span>Discount ({discountPercent}%):</span>
                      <span>- {currency} {discountAmount.toLocaleString()}</span>
                    </div>
                  )}

                  {taxPercent > 0 && (
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: "13px", color: "#64748b" }}>
                      <span>Tax / GST ({taxPercent}%):</span>
                      <strong style={{ color: "#1e293b" }}>+ {currency} {taxAmount.toLocaleString()}</strong>
                    </div>
                  )}

                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      borderTop: "2px solid #0f172a",
                      paddingTop: "10px",
                      marginTop: "4px",
                      fontSize: "18px",
                      fontWeight: "900",
                      color: "#0f172a",
                    }}
                  >
                    <span>Total Due:</span>
                    <span style={{ color: "#4f46e5" }}>{currency} {grandTotal.toLocaleString()}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom Section: Payment Details & Bank Transfer Info for Startup Finance */}
            <div>
              <div
                style={{
                  background: "#f8fafc",
                  borderRadius: "8px",
                  padding: "16px 20px",
                  border: "1px solid #e2e8f0",
                  display: "grid",
                  gridTemplateColumns: "1.4fr 1fr",
                  gap: "16px",
                  marginBottom: "20px",
                }}
              >
                <div>
                  <h4 style={{ fontSize: "12px", textTransform: "uppercase", letterSpacing: "0.5px", color: "#475569", margin: "0 0 6px 0", fontWeight: "700" }}>
                    Official Bank Transfer Info (For Company Accounts)
                  </h4>
                  <div style={{ fontSize: "12px", color: "#1e293b", lineHeight: "1.5" }}>
                    <div><strong>Payee Name:</strong> {editor.name}</div>
                    <div><strong>Bank & Details:</strong> {editor.bankDetails}</div>
                    {editor.upiId && <div><strong>UPI ID:</strong> {editor.upiId}</div>}
                  </div>
                </div>
                <div>
                  <h4 style={{ fontSize: "12px", textTransform: "uppercase", letterSpacing: "0.5px", color: "#475569", margin: "0 0 6px 0", fontWeight: "700" }}>
                    Startup Notes & Compliance
                  </h4>
                  <p style={{ fontSize: "11px", color: "#64748b", margin: 0, lineHeight: "1.4" }}>
                    {invoiceMeta.notes}
                  </p>
                </div>
              </div>

              {/* Signature / Authorization */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", paddingTop: "12px", borderTop: "1px solid #e2e8f0" }}>
                <div style={{ fontSize: "11px", color: "#94a3b8" }}>
                  This invoice is computer generated and digitally validated.
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontFamily: "cursive, sans-serif", fontSize: "18px", color: "#312e81" }}>
                    {editor.name}
                  </div>
                  <div style={{ fontSize: "11px", color: "#64748b", borderTop: "1px solid #cbd5e1", paddingTop: "2px", marginTop: "2px" }}>
                    Authorized Creative Signatory
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}

// Styling Constants
const cardStyle = {
  background: "#161923",
  border: "1px solid #232938",
  borderRadius: "12px",
  padding: "20px",
  boxShadow: "0 4px 16px rgba(0,0,0,0.2)",
};

const cardHeaderStyle = {
  display: "flex",
  alignItems: "center",
  gap: "10px",
  marginBottom: "14px",
};

const cardTitleStyle = {
  fontSize: "14px",
  fontWeight: "700",
  color: "#f1f5f9",
  margin: 0,
};

const labelStyle = {
  display: "block",
  fontSize: "11px",
  fontWeight: "600",
  textTransform: "uppercase",
  letterSpacing: "0.5px",
  color: "#94a3b8",
  marginBottom: "6px",
};

const inputStyle = {
  width: "100%",
  padding: "9px 12px",
  background: "#1b202c",
  border: "1px solid #2d3748",
  borderRadius: "6px",
  color: "#f8fafc",
  fontSize: "13px",
  outline: "none",
  transition: "border 0.2s ease",
};
