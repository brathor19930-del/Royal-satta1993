  marqueeText: "🔥 पहली बार अमाउंट रिफिल कराने पर 10% बोनस! उसके बाद हर बार रिफिल पर 3% बोनस! दोस्तों को रेफर करने पर ₹50 का भारी बोनस पाएं! 🔥"
};

app.post("/api/send-otp", (req, res) => {
  const { mobile } = req.body;
  if (!mobile || mobile.length < 10) return res.json({ success: false, error: "Sahi mobile number dalein!" });
  let otp = Math.floor(1000 + Math.random() * 9000);
  res.json({ success: true, message: "OTP bhej diya gaya hai!", demoOtp: otp });
});

app.post("/api/register-password", (req, res) => {
  const { mobile, username, password } = req.body;
  if (!mobile || !password || password.length !== 4) return res.json({ success: false, error: "4 digit password dalein!" });

  let user = usersDB.find(u => u.mobile === mobile);
  if (user) { user.password = password; if (username) user.username = username; }
  else {
    usersDB.push({ mobile, username: username || "Royal Player", password, balance: 500.00, referralCode: "ROYAL1993", isFirstRefill: true });
  }
  let updatedUser = usersDB.find(u => u.mobile === mobile);
  res.json({ success: true, message: "Account setup safal raha!", user: updatedUser });
});

app.post("/api/login-password", (req, res) => {
  const { mobile, password } = req.body;
  let user = usersDB.find(u => u.mobile === mobile && u.password === password);
  if (!user) return res.json({ success: false, error: "Galat mobile number ya password!" });
  res.json({ success: true, message: "Login safal raha!", user });
});

app.post("/api/wallet", (req, res) => {
  const { mobile } = req.body;
  let user = usersDB.find(u => u.mobile === mobile) || { balance: 500.00, referralCode: "ROYAL1993", username: "Royal Satta" };
  res.json({ success: true, ...user, adminSettings });
});

app.get("/api/fund-history", (req, res) => {
  res.json({ success: true, history: fundHistory });
});

app.post("/api/add-fund-request", (req, res) => {
  const { mobile, amount, paymentMethod } = req.body;
  const numAmount = parseFloat(amount);
  if (!numAmount || numAmount <= 0) return res.json({ success: false, error: "Invalid amount!" });

  let user = usersDB.find(u => u.mobile === mobile);
  let bonus = numAmount * (user && user.isFirstRefill ? 0.10 : 0.03);
  fundHistory.unshift({
    id: Date.now(), type: "Deposit Request", mobile: mobile || "N/A", method: paymentMethod || "UPI",
    amount: numAmount, bonus, total: numAmount + bonus, status: "Pending (Admin Approval)", date: new Date().toLocaleString()
  });
  res.json({ success: true, message: "Deposit request bhej di gayi hai!" });
});

app.post("/api/withdraw", (req, res) => {
  const { mobile, amount, upiId } = req.body;
  const numAmount = parseFloat(amount);
  let user = usersDB.find(u => u.mobile === mobile);
  if (!numAmount || numAmount <= 0 || !user || user.balance < numAmount) return res.json({ success: false, error: "Paryapt balance nahi hai!" });

  user.balance -= numAmount;
  fundHistory.unshift({
    id: Date.now(), type: "Withdrawal", mobile, method: upiId, amount: numAmount, bonus: 0, total: numAmount, status: "Pending", date: new Date().toLocaleString()
  });
  res.json({ success: true, message: "Withdrawal request lag chuki hai!", newBalance: user.balance });
});

app.post("/api/place-bid", (req, res) => {
  const { mobile, market, totalAmount, details } = req.body;
  let user = usersDB.find(u => u.mobile === mobile);
  if (!user || user.balance < totalAmount) return res.json({ success: false, error: "Paryapt balance nahi hai!" });

  user.balance -= Number(totalAmount);
  allBids.push({ id: Date.now(), mobile, market: market || "DELHI BAZAR", totalAmount: Number(totalAmount), details: details || [], date: new Date().toLocaleDateString(), timestamp: new Date().toLocaleTimeString() });
  res.json({ success: true, message: "Bid safalta purvak lag gaya!", newBalance: user.balance });
});

app.post("/api/admin/send-super-otp", (req, res) => {
  const { mobile, password } = req.body;
  let foundSuper = superAdminsList.find(s => s.mobile === mobile && s.password === password);
  if (!foundSuper) {
    return res.json({ success: false, error: "Aapka Super Admin mobile number ya password galat hai!" });
  }
});
let demoOtp = "123456";
res.json({ success: true, message: "OTP bhej diya gaya hai", otp: demoOtp });

app.post("/api/admin/login", (req, res) => {
  const { mobile, password, token } = req.body;
  
  if (token) {
    let foundSub = subAdminsDB.find(s => s.token === token);
    if (foundSub) {
      return res.json({ success: true, role: "sub_admin", name: foundSub.name, message: "WhatsApp Link Login Successful!" });
    }
    return res.json({ success: false, error: "Amaan-ya WhatsApp link!" });
  }

  let foundSuper = superAdminsList.find(s => s.mobile === mobile && s.password === password);
  if (foundSuper) {
    return res.json({ success: true, role: "super_admin", name: foundSuper.name, message: "Super Admin Verified & Login Successful!" });
  }
  
  let foundSub = subAdminsDB.find(s => s.username === mobile && s.password === password);
  if (foundSub) {
    return res.json({ success: true, role: "sub_admin", name: foundSub.name, message: "Sub Admin Login Successful!" });
  }

  res.json({ success: false, error: "Galat mobile number ya password!" });
});

app.get("/api/admin/dashboard-stats", (req, res) => {
  let totalUsers = usersDB.length;
  let totalDeposits = fundHistory.filter(h => h.type === "Deposit Request" && h.status === "Approved").reduce((sum, h) => sum + h.total, 0);
  let totalWithdrawals = fundHistory.filter(h => h.type === "Withdrawal" && h.status === "Processed").reduce((sum, h) => sum + h.total, 0);
  let pendingRequests = fundHistory.filter(h => h.status.includes("Pending")).length;
  let totalGameBusiness = allBids.reduce((sum, b) => sum + b.totalAmount, 0);

  let marketTotals = {};
  allBids.forEach(b => { marketTotals[b.market] = (marketTotals[b.market] || 0) + b.totalAmount; });

  res.json({
    success: true,
    stats: { totalUsers, totalDeposits, totalWithdrawals, pendingRequests, totalGameBusiness },
    history: fundHistory,
    marketResults,
    adminSettings,
    users: usersDB,
    allBids,
    marketsList,
    marketTotals,
    subAdminsDB
  });
});

// Automatic India Country Code (+91) Fixer for WhatsApp
app.post("/api/admin/add-subadmin", (req, res) => {
  let { name, username, mobile } = req.body;
  if (!name || !username || !mobile) return res.json({ success: false, error: "Sabhi details bharein!" });

  // Clean mobile number (remove spaces, hyphens, etc.)
  mobile = mobile.trim().replace(/\D/g, '');
  if (mobile.length < 10) return res.json({ success: false, error: "Kripya sahi 10-digit mobile number dalein!" });

  // Ensure India country code +91 is prefixed
  if (!mobile.startsWith('91')) {
    mobile = '91' + mobile.slice(-10);
  }
  
  let token = 'subtoken_' + Math.random().toString(36).substring(2, 9);
  let newSub = { id: Date.now(), name, username, mobile, password: "sub123", token };
  subAdminsDB.push(newSub);

  let loginLink = `http://localhost:5000/admin.html?sub=${token}`;
  let whatsappText = `Hello ${name}, yeh raha aapka Royal Satta 1993 ka Sub-Admin login link:\n${loginLink}`;
  let whatsappUrl = `https://api.whatsapp.com/send?phone=${mobile}&text=${encodeURIComponent(whatsappText)}`;

  res.json({ success: true, message: `Sub Admin (${name}) safalta purvak jud gaya!`, whatsappUrl });
});

app.post("/api/admin/remove-subadmin", (req, res) => {
  const { id } = req.body;
  subAdminsDB = subAdminsDB.filter(s => s.id != id);
  res.json({ success: true, message: "Sub Admin hata diya gaya hai!" });
});

app.post("/api/admin/update-settings", (req, res) => {
  const { upiId, qrImage, marqueeText } = req.body;
  if (upiId) adminSettings.upiId = upiId;
  if (qrImage) adminSettings.qrImage = qrImage;
  if (marqueeText) adminSettings.marqueeText = marqueeText;
  res.json({ success: true, message: "Settings update ho gayi!" });
});

app.post("/api/admin/add-market", (req, res) => {
  const { name, closeTime } = req.body;
  if (!name) return res.json({ success: false, error: "Market ka naam zaroori hai!" });
  marketsList.push({ name: name.toUpperCase(), openTime: '07:00 AM', closeTime: closeTime || '10:00 PM' });
  res.json({ success: true, message: `Naya market (${name.toUpperCase()}) jud gaya hai!` });
});

app.post("/api/admin/declare-result", (req, res) => {
  const { marketName, resultNumber } = req.body;
  marketResults[marketName] = { result: resultNumber, date: new Date().toLocaleDateString() };
  res.json({ success: true, message: "Result declare ho gaya!" });
});

app.post("/api/admin/approve", (req, res) => {
  const { id } = req.body;
  let item = fundHistory.find(h => h.id == id);
  if (item && item.status.includes("Pending")) {
    item.status = item.type === "Deposit Request" ? "Approved" : "Processed";
    if (item.type === "Deposit Request") {
      let user = usersDB.find(u => u.mobile === item.mobile);
      if (user) { user.balance += item.total; user.isFirstRefill = false; }
    }
    res.json({ success: true, message: "Request approved!" });
  } else { res.json({ success: false, error: "Request nahi mili!" }); }
});

app.post("/api/admin/reject", (req, res) => {
  const { id } = req.body;
  let item = fundHistory.find(h => h.id == id);
  if (item && item.status.includes("Pending")) {
    item.status = "Rejected";
    if (item.type === "Withdrawal") {
      let user = usersDB.find(u => u.mobile === item.mobile);
      if (user) user.balance += item.total;
    }
    res.json({ success: true, message: "Request reject ho gayi." });
  } else { res.json({ success: false, error: "Request nahi mili!" }); }
});

app.get('/api/markets', (req, res) => {
  const processedMarkets = marketsList.map(m => ({
    name: m.name,
    openTime: m.openTime,
    closeTime: m.closeTime,
    status: 'Running',
    result: marketResults[m.name] ? marketResults[m.name].result : '***'
  }));
  res.json({ success: true, markets: processedMarkets, marquee: adminSettings.marqueeText });
});

app.listen(5000, () => console.log("Server running on port 5000"));
let appSettings = {
    whatsappNumber: "919999999999",
    telegramChannel: "https://t.me/your_channel"
};
// Send OTP Route
app.post("/api/send-otp", (req, res) => {
    const { mobile } = req.body;
    
    if (!mobile || mobile.length < 10) {
        return res.json({ success: false, message: "Invalid mobile number" });
    }

    // Testing ke liye fixed OTP "123456" rakhte hain taaki login karne mein koi dikkat na aaye
    let otp = "123456"; 
    
    console.log(`OTP sent to ${mobile}: ${otp}`);
    res.json({ success: true, message: "OTP bhej diya gaya hai", otp: otp });
});
// Chhota aur unique redirect link (jaise /app ya /dl)
app.get("/app", (req, res) => {
    res.redirect("/"); // Ye aapko seedha main app par le jayega
});
