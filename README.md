# 🧾 KHIPU
### AI-Powered Invoice Validation with Local Multimodal AI + Web3 Payments

**AI-powered invoice reconciliation for LATAM SMEs. Runs locally. Pays on-chain.**

---

## 🎯 The Problem

Small logistics companies in Latin America process **hundreds of invoices per month** manually. The result:

- 💸 **$5K–$50K USD/year** lost to duplicate payments, fake suppliers, and quantity mismatches
- ⏱️ **7 minutes per invoice** of repetitive human validation
- 🔓 **23% of invoices** contain discrepancies that go undetected until it's too late

## 💡 The Solution: Khipu

Khipu (Quechua for "knot", the Incan accounting system) is an **end-to-end invoice validation pipeline** that:

1. **Extracts** data from any invoice photo — even crumpled, low-quality ones
2. **Validates** using QVAC multimodal AI running **locally on the user's laptop** (no cloud, no data leak)
3. **Reconciles** automatically against Purchase Orders and Delivery Guides
4. **Decides** via traffic-light system (🟢 Approve / 🟡 Review / 🔴 Block)
5. **Pays** with one click through MetaMask (USDT on Ethereum/Sepolia)

## 🚀 Quick Start

```bash
# Clone
git clone https://github.com/gonnnzaDev/khipu.git
cd khipu

# Backend
python -m venv venv
venv\Scripts\activate    # Windows
# source venv/bin/activate  # Linux/Mac
pip install -r requirements.txt
python -m uvicorn main:app --reload --port 8000

# Frontend (separate terminal)
cd frontend/kiphu-frontend
npm install
npm run dev
