/* ============================================================
   CONFIG
   ============================================================ */
var GHL_WEBHOOK_URL = "REPLACE_WITH_YOUR_GHL_WEBHOOK_URL";
var BOOKING_URL     = "https://occuply.co/contact";

/* ============================================================
   QUESTIONS
   ============================================================ */
var QUESTIONS = [
  {
    cat:"Acquire · Phone handling",
    q:"When a prospective renter calls and no one answers, what happens?",
    options:[
      {t:"An automated text goes out within a minute asking how we can help",leak:0,score:0},
      {t:"It goes to voicemail and we call back the same day",leak:900,score:2},
      {t:"It goes to voicemail and we call back when we can",leak:1500,score:3},
      {t:"Honestly, missed calls usually just get missed",leak:2200,score:3}
    ]
  },
  {
    cat:"Acquire · Lead capture",
    q:"How do you capture inquiries that come in from your website?",
    options:[
      {t:"Every web form drops straight into a CRM and triggers a response",leak:0,score:0},
      {t:"They email us and we reply when we see it",leak:800,score:2},
      {t:"They go to an inbox a few people check",leak:1200,score:3},
      {t:"We're not totally sure where web inquiries land",leak:1600,score:3}
    ]
  },
  {
    cat:"Acquire · Source visibility",
    q:"Do you know which marketing sources actually produce your tenants?",
    options:[
      {t:"Yes, every lead is tagged by source and we track conversion",leak:0,score:0},
      {t:"Roughly. We have a general sense",leak:500,score:1},
      {t:"Not really. We know our total spend but not what converts",leak:1000,score:2},
      {t:"No, we have no source tracking at all",leak:1400,score:3}
    ]
  },
  {
    cat:"Intervene · Speed to lead",
    q:"On average, how fast does a new web inquiry get a first response?",
    options:[
      {t:"Within 5 minutes, automatically",leak:0,score:0},
      {t:"Within an hour during business hours",leak:900,score:1},
      {t:"Within a few hours",leak:1600,score:2},
      {t:"Same day if we're lucky, sometimes the next day",leak:2400,score:3}
    ]
  },
  {
    cat:"Intervene · After hours",
    q:"What happens to inquiries that come in after you close?",
    options:[
      {t:"An automated response engages them immediately, any hour",leak:0,score:0},
      {t:"They wait until morning but we always follow up",leak:1000,score:2},
      {t:"They wait until someone gets in and notices",leak:1500,score:3},
      {t:"After-hours leads usually fall through the cracks",leak:2000,score:3}
    ]
  },
  {
    cat:"Intervene · Follow-up",
    q:"If a lead doesn't book on first contact, what happens next?",
    options:[
      {t:"An automated sequence follows up for 7+ days until they respond",leak:0,score:0},
      {t:"We try once or twice more manually",leak:1100,score:2},
      {t:"We follow up if we remember",leak:1700,score:3},
      {t:"We don't really follow up after the first contact",leak:2300,score:3}
    ]
  },
  {
    cat:"Intervene · Consistency",
    q:"How consistent is your inquiry handling across staff and shifts?",
    options:[
      {t:"Fully systemized, every inquiry is handled the same way",leak:0,score:0},
      {t:"Mostly consistent, with some variation",leak:600,score:1},
      {t:"It depends heavily on who's working",leak:1200,score:2},
      {t:"Every person does it differently",leak:1500,score:3}
    ]
  },
  {
    cat:"Move-In · Pipeline",
    q:"Can you see every active lead and where they are in your pipeline?",
    options:[
      {t:"Yes, a live pipeline shows every lead's stage",leak:0,score:0},
      {t:"Sort of. We keep a spreadsheet",leak:700,score:2},
      {t:"Only in people's heads",leak:1300,score:3},
      {t:"No, once they're not on a call we lose track",leak:1700,score:3}
    ]
  },
  {
    cat:"Move-In · Reactivation",
    q:"What happens to leads who inquired months ago but never moved in?",
    options:[
      {t:"A monthly campaign automatically re-engages cold leads",leak:0,score:0},
      {t:"We occasionally reach back out to old leads",leak:700,score:2},
      {t:"They sit in a list nobody touches",leak:1200,score:3},
      {t:"We don't keep old leads at all",leak:1500,score:3}
    ]
  },
  {
    cat:"Context · Pricing",
    q:"What's your average monthly rent per unit? (used to size your leak)",
    type:"rent"
  }
];

/* ============================================================
   STATE
   ============================================================ */
var current = 0;
var answers = {};
var avgRent = 125;
var leadData = {};

/* ============================================================
   SCREEN MANAGEMENT
   ============================================================ */
function show(id) {
  var screens = ["screen-intro","screen-question","screen-gate","screen-results"];
  for (var i = 0; i < screens.length; i++) {
    document.getElementById(screens[i]).classList.add("hidden");
  }
  var el = document.getElementById(id);
  el.classList.remove("hidden");
  el.classList.remove("step");
  void el.offsetWidth;
  el.classList.add("step");

  var ts = document.getElementById("trust-strip");
  ts.style.display = (id === "screen-intro") ? "flex" : "none";

  try { document.documentElement.scrollTop = 0; } catch(e) {}
  try { document.body.scrollTop = 0; } catch(e) {}
  try {
    var card = document.getElementById("card");
    if (card) card.scrollIntoView({block:"start"});
  } catch(e) {}
}

/* ============================================================
   QUESTION RENDERING
   ============================================================ */
function startTest() {
  current = 0;
  answers = {};
  renderQuestion();
  show("screen-question");
}

function renderQuestion() {
  var Q = QUESTIONS[current];
  var total = QUESTIONS.length;
  document.getElementById("prog-step").textContent = "Question " + (current + 1) + " of " + total;
  var pct = Math.round((current / total) * 100);
  document.getElementById("prog-pct").textContent = pct + "%";
  document.getElementById("prog-fill").style.width = pct + "%";
  document.getElementById("q-category").textContent = Q.cat;
  document.getElementById("q-text").textContent = Q.q;
  document.getElementById("q-back").disabled = (current === 0);

  var box = document.getElementById("q-options");
  var hint = document.getElementById("q-hint");

  if (Q.type === "rent") {
    hint.textContent = "Enter your average and we'll calculate your leak";
    var savedRent = (answers[current] && answers[current].rent) ? answers[current].rent : "";
    box.innerHTML =
      '<div class="rent-field">' +
        '<span class="dollar">$</span>' +
        '<input class="rent-input" type="number" id="rent-input" inputmode="numeric" min="0" placeholder="125" value="' + savedRent + '" />' +
      '</div>' +
      '<p class="rent-help">Industry average is around $125/month. A rough number is fine.</p>' +
      '<button type="button" class="btn btn-primary btn-lg" id="btn-submit-rent" style="margin-top:18px">' +
        'See my estimated leak' +
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18"><path d="M5 12h14M12 5l7 7-7 7"/></svg>' +
      '</button>';

    var rentBtn = document.getElementById("btn-submit-rent");
    if (rentBtn) {
      onTap(rentBtn, submitRent);
    }
    var rentInput = document.getElementById("rent-input");
    if (rentInput) {
      rentInput.addEventListener("keydown", function(e) {
        if (e.key === "Enter") { e.preventDefault(); submitRent(); }
      });
      setTimeout(function() { rentInput.focus(); }, 120);
    }
    return;
  }

  hint.textContent = "Select an answer to continue";
  box.innerHTML = "";

  Q.options.forEach(function(opt, i) {
    var sel = answers[current] && answers[current].idx === i;
    var b = document.createElement("button");
    b.type = "button";
    b.className = "option" + (sel ? " selected" : "");

    var tick = document.createElement("span");
    tick.className = "tick";
    if (sel) {
      tick.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><path d="M20 6L9 17l-5-5"/></svg>';
    }

    var label = document.createElement("span");
    label.textContent = opt.t;

    b.appendChild(tick);
    b.appendChild(label);

    (function(idx) {
      var _fired = false;
      b.addEventListener("touchend", function(e) {
        e.preventDefault();
        if (_fired) return;
        _fired = true;
        setTimeout(function(){ _fired = false; }, 600);
        selectOption(idx);
      }, {passive: false});
      b.addEventListener("click", function() {
        if (_fired) return;
        _fired = true;
        setTimeout(function(){ _fired = false; }, 600);
        selectOption(idx);
      });
    })(i);

    box.appendChild(b);
  });
}

function selectOption(i) {
  var Q = QUESTIONS[current];
  var opt = Q.options[i];
  answers[current] = {idx:i, leak:opt.leak, score:opt.score, label:opt.t, category:Q.cat};
  renderQuestion();
  setTimeout(function() {
    if (current < QUESTIONS.length - 1) {
      current++;
      renderQuestion();
    } else {
      goToGate();
    }
  }, 220);
}

function submitRent() {
  var input = document.getElementById("rent-input");
  var v = input ? parseInt(input.value, 10) : 0;
  avgRent = (isNaN(v) || v <= 0) ? 125 : v;
  answers[current] = {rent:avgRent, leak:0, score:0, label:"Avg rent $" + avgRent, category:"Context · Pricing"};
  goToGate();
}

function prevQuestion() {
  if (current > 0) { current--; renderQuestion(); }
}

/* ============================================================
   SCORING
   ============================================================ */
function computeLeak() {
  var base = 0;
  for (var i = 0; i < QUESTIONS.length; i++) {
    if (answers[i] && QUESTIONS[i].type !== "rent") base += answers[i].leak;
  }
  var rentFactor = Math.max(0.6, Math.min(2.2, avgRent / 125));
  return Math.round((base * rentFactor) / 50) * 50;
}

function computeGrade() {
  var score = 0, max = 0;
  for (var i = 0; i < QUESTIONS.length; i++) {
    if (QUESTIONS[i].type === "rent") continue;
    max += 3;
    if (answers[i]) score += answers[i].score;
  }
  var ratio = max > 0 ? score / max : 0;
  if (ratio <= 0.12) return {letter:"A", word:"Excellent", tier:"strong"};
  if (ratio <= 0.30) return {letter:"B", word:"Solid",     tier:"strong"};
  if (ratio <= 0.50) return {letter:"C", word:"Needs Work",tier:"high"};
  if (ratio <= 0.72) return {letter:"D", word:"Leaking",   tier:"critical"};
  return {letter:"F", word:"Critical", tier:"critical"};
}

/* ============================================================
   GATE
   ============================================================ */
function goToGate() {
  var leak = computeLeak();
  document.getElementById("gate-leak").innerHTML =
    "$" + leak.toLocaleString() +
    '<span style="font-size:20px;font-weight:400;opacity:.7">/mo</span>';
  document.getElementById("prog-fill").style.width = "100%";
  document.getElementById("prog-pct").textContent = "100%";
  show("screen-gate");
  fireWebhook("test_completed", {monthly_leak: leak});
}

function validEmail(e) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);
}

function submitGate() {
  var name     = document.getElementById("in-name").value.trim();
  var email    = document.getElementById("in-email").value.trim();
  var company  = document.getElementById("in-company").value.trim();
  var facs     = document.getElementById("in-facilities").value;
  var ok = true;
  var fName  = document.getElementById("f-name");
  var fEmail = document.getElementById("f-email");

  if (!name)          { fName.classList.add("err");  ok = false; }
  else                { fName.classList.remove("err"); }
  if (!validEmail(email)) { fEmail.classList.add("err");  ok = false; }
  else                    { fEmail.classList.remove("err"); }
  if (!ok) return;

  var leak  = computeLeak();
  var grade = computeGrade();
  var parts = name.split(" ");
  leadData = {
    name: name,
    email: email,
    company: company,
    first_name: parts[0] || name,
    last_name: parts.slice(1).join(" ") || "",
    num_facilities: facs,
    monthly_leak: leak,
    annual_leak: leak * 12,
    grade_letter: grade.letter,
    grade_label: grade.word,
    avg_rent: avgRent
  };
  fireWebhook("lead_captured", leadData);
  renderResults(grade, leak);
  show("screen-results");
}

/* ============================================================
   RESULTS
   ============================================================ */
function renderResults(grade, leak) {
  var hero = document.getElementById("result-hero");
  var gradeClass = "strong";
  if (grade.letter === "C") gradeClass = "moderate";
  else if (grade.letter === "D") gradeClass = "high";
  else if (grade.letter === "F") gradeClass = "critical";
  else if (grade.letter === "B") gradeClass = "good";
  hero.className = "result-hero grade-" + gradeClass;
  document.getElementById("grade-letter").textContent = grade.letter;
  document.getElementById("grade-word").textContent   = grade.word;

  var headlines = {
    A: "Your inquiry system is doing what most operators only wish theirs did.",
    B: "You're ahead of most operators, but there's still revenue on the table.",
    C: "Your foundation works, but clear gaps are costing you tenants every month.",
    D: "Revenue is leaking out of your inquiry process in several places.",
    F: "Your inquiry-to-move-in process is losing serious revenue right now."
  };
  document.getElementById("result-headline").textContent = headlines[grade.letter];
  document.getElementById("res-monthly").textContent = "$" + leak.toLocaleString();
  document.getElementById("res-annual").textContent  = "$" + (leak * 12).toLocaleString();

  var groups = {};
  for (var i = 0; i < QUESTIONS.length; i++) {
    if (QUESTIONS[i].type === "rent" || !answers[i]) continue;
    var stage = QUESTIONS[i].cat.split("·")[0].trim();
    if (!groups[stage]) groups[stage] = {leak:0, items:[]};
    groups[stage].leak += answers[i].leak;
    groups[stage].items.push({
      cat:   QUESTIONS[i].cat.split("·")[1].trim(),
      leak:  answers[i].leak,
      score: answers[i].score
    });
  }

  var rentFactor = Math.max(0.6, Math.min(2.2, avgRent / 125));
  var leakVals = Object.keys(groups).map(function(k){ return groups[k].leak; });
  var maxLeak  = Math.max.apply(null, leakVals.concat([1]));
  var box = document.getElementById("breakdown");
  box.innerHTML = "";

  var descs = {
    "Acquire":   "How inquiries get captured and tracked when they first reach you.",
    "Intervene": "How fast and how consistently you respond and follow up.",
    "Move-In":   "How you track, manage, and reactivate leads through to a signed lease."
  };

  Object.keys(groups).forEach(function(stage) {
    var g      = groups[stage];
    var scaled = Math.round((g.leak * rentFactor) / 50) * 50;
    var sev    = g.leak === 0 ? "none" : g.leak >= maxLeak * 0.66 ? "high" : g.leak >= maxLeak * 0.33 ? "mid" : "low";
    var pct    = Math.max(4, Math.round((g.leak / maxLeak) * 100));

    var item = document.createElement("div");
    item.className = "leak-item";
    item.innerHTML =
      '<div class="leak-item-top">' +
        '<span class="leak-item-name">' + stage + '</span>' +
        '<span class="leak-item-amt sev-' + sev + '">' + (scaled === 0 ? "On track" : "~$" + scaled.toLocaleString() + "/mo") + '</span>' +
      '</div>' +
      '<div class="leak-bar"><div class="leak-bar-fill sev-' + sev + '" style="width:0%"></div></div>' +
      '<div class="leak-item-desc">' + (descs[stage] || "") + '</div>';
    box.appendChild(item);

    setTimeout(function() {
      var fill = item.querySelector(".leak-bar-fill");
      if (fill) fill.style.width = pct + "%";
    }, 120);
  });

  renderCTA(grade, leak);
}

function renderCTA(grade, leak) {
  var block   = document.getElementById("cta-block");
  var lbl     = document.getElementById("cta-tier-lbl");
  var h       = document.getElementById("cta-headline");
  var p       = document.getElementById("cta-copy");
  var primary = document.getElementById("cta-primary");
  primary.href = BOOKING_URL;

  if (grade.tier === "critical") {
    block.className = "cta-block tier-critical";
    lbl.textContent = "Priority: Critical";
    h.textContent   = "Let's stop the bleeding";
    p.textContent   = "At roughly $" + leak.toLocaleString() + "/month, this is the most expensive problem in your business right now, and the most fixable. A Revenue Recovery Audit maps exactly where it's leaking and what to fix first.";
    primary.textContent = "Book a Revenue Recovery Audit";
  } else if (grade.tier === "high") {
    block.className = "cta-block tier-high";
    lbl.textContent = "Priority: High";
    h.textContent   = "Worth a 20-minute conversation";
    p.textContent   = "You've got a working foundation with a few costly gaps. A short discovery call will show you which 2-3 fixes would recover the most revenue, fastest.";
    primary.textContent = "Book a discovery call";
  } else {
    block.className = "cta-block tier-standard";
    lbl.textContent = "Priority: Optimize";
    h.textContent   = "You're running a tight ship";
    p.textContent   = "You're ahead of most operators. If you want to push from good to airtight, with tighter response times and smarter reactivation, a quick call is worth your time.";
    primary.textContent = "Book a discovery call";
  }
}

/* ============================================================
   RESTART
   ============================================================ */
function restart() {
  current = 0; answers = {}; avgRent = 125; leadData = {};
  document.getElementById("in-name").value      = "";
  document.getElementById("in-email").value     = "";
  document.getElementById("in-company").value   = "";
  document.getElementById("in-facilities").value = "";
  show("screen-intro");
}

/* ============================================================
   WEBHOOK
   ============================================================ */
function fireWebhook(event, data) {
  if (!GHL_WEBHOOK_URL || GHL_WEBHOOK_URL.indexOf("REPLACE") === 0) return;
  setTimeout(function() {
    try {
      var params = {};
      try {
        var qs = window.location.search.slice(1).split("&");
        for (var i = 0; i < qs.length; i++) {
          var pair = qs[i].split("=");
          if (pair[0]) params[decodeURIComponent(pair[0])] = decodeURIComponent(pair[1] || "");
        }
      } catch(e) {}

      var payload = {
        event: event,
        source: "revenue_leak_test",
        utm_source:   params["utm_source"]   || "",
        utm_medium:   params["utm_medium"]   || "",
        utm_campaign: params["utm_campaign"] || "",
        completed_at: new Date().toISOString()
      };
      for (var k in data) {
        if (data.hasOwnProperty(k)) payload[k] = data[k];
      }

      fetch(GHL_WEBHOOK_URL, {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify(payload)
      }).catch(function() {});
    } catch(e) {}
  }, 0);
}

/* ============================================================
   TAP HELPER — touchend primary, click fallback, double-fire guard
   ============================================================ */
function onTap(el, fn) {
  if (!el) return;
  var fired = false;
  el.addEventListener("touchend", function(e) {
    e.preventDefault();
    if (fired) return;
    fired = true;
    setTimeout(function() { fired = false; }, 600);
    fn();
  }, {passive: false});
  el.addEventListener("click", function() {
    if (fired) return;
    fired = true;
    setTimeout(function() { fired = false; }, 600);
    fn();
  });
}

/* ============================================================
   INIT — uses event delegation on document so it works even
   when GHL re-renders the DOM after script execution.
   Also retries every 200ms for up to 5s until elements exist.
   ============================================================ */
function attachListeners() {
  var btnStart   = document.getElementById("btn-start");
  var btnBack    = document.getElementById("q-back");
  var btnGate    = document.getElementById("gate-btn");
  var btnRestart = document.getElementById("btn-restart");

  if (!btnStart) return false; // DOM not ready yet

  /* Dummy touchstart — makes iOS Safari treat container as interactive */
  ["card","screen-intro","screen-question","screen-gate","screen-results"].forEach(function(id) {
    var el = document.getElementById(id);
    if (el) el.addEventListener("touchstart", function(){}, {passive:true});
  });

  onTap(btnStart,   startTest);
  onTap(btnBack,    prevQuestion);
  onTap(btnGate,    submitGate);
  onTap(btnRestart, restart);

  ["in-name","in-email","in-company"].forEach(function(id) {
    var f = document.getElementById(id);
    if (f) {
      f.addEventListener("keydown", function(e) {
        if (e.key === "Enter") { e.preventDefault(); submitGate(); }
      });
    }
  });

  /* Event delegation fallback — catches any clicks that bubble up
     in case direct binding still fails in GHL iframe */
  document.addEventListener("touchend", function(e) {
    var t = e.target;
    while (t && t !== document) {
      if (t.id === "btn-start")   { e.preventDefault(); startTest();   return; }
      if (t.id === "q-back")      { e.preventDefault(); prevQuestion(); return; }
      if (t.id === "gate-btn")    { e.preventDefault(); submitGate();  return; }
      if (t.id === "btn-restart") { e.preventDefault(); restart();     return; }
      if (t.id === "btn-submit-rent") { e.preventDefault(); submitRent(); return; }
      if (t.classList && t.classList.contains("option")) {
        e.preventDefault();
        var opts = t.parentNode.querySelectorAll(".option");
        for (var i = 0; i < opts.length; i++) {
          if (opts[i] === t) { selectOption(i); return; }
        }
      }
      t = t.parentNode;
    }
  }, {passive: false});

  document.addEventListener("click", function(e) {
    var t = e.target;
    while (t && t !== document) {
      if (t.id === "btn-start")   { startTest();   return; }
      if (t.id === "q-back")      { prevQuestion(); return; }
      if (t.id === "gate-btn")    { submitGate();  return; }
      if (t.id === "btn-restart") { restart();     return; }
      if (t.id === "btn-submit-rent") { submitRent(); return; }
      if (t.classList && t.classList.contains("option")) {
        var opts = t.parentNode.querySelectorAll(".option");
        for (var i = 0; i < opts.length; i++) {
          if (opts[i] === t) { selectOption(i); return; }
        }
      }
      t = t.parentNode;
    }
  });

  show("screen-intro");
  return true;
}

function initLeakTest() {
  if (!attachListeners()) {
    /* Elements not in DOM yet — retry every 200ms up to 5 seconds */
    var attempts = 0;
    var timer = setInterval(function() {
      attempts++;
      if (attachListeners() || attempts >= 25) {
        clearInterval(timer);
      }
    }, 200);
  }
}


/* Expose functions to window scope for GHL iframe compatibility */
window.startTest    = startTest;
window.prevQuestion = prevQuestion;
window.submitGate   = submitGate;
window.submitRent   = submitRent;
window.restart      = restart;
window.selectOption = selectOption;
window.initLeakTest = initLeakTest;

/* Multiple entry points — covers all GHL loading scenarios */
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initLeakTest);
} else {
  initLeakTest();
}
window.addEventListener("load", initLeakTest);
setTimeout(initLeakTest, 500);
setTimeout(initLeakTest, 1500);
setTimeout(initLeakTest, 3000);

/* Nuclear option: also attach to window for GHL iframe scenarios */
window.addEventListener("touchend", function(e) {
  var t = e.target;
  while (t && t !== document.body) {
    if (t.id === "btn-start")       { e.preventDefault(); e.stopImmediatePropagation(); startTest();    return; }
    if (t.id === "q-back")          { e.preventDefault(); e.stopImmediatePropagation(); prevQuestion(); return; }
    if (t.id === "gate-btn")        { e.preventDefault(); e.stopImmediatePropagation(); submitGate();   return; }
    if (t.id === "btn-restart")     { e.preventDefault(); e.stopImmediatePropagation(); restart();      return; }
    if (t.id === "btn-submit-rent") { e.preventDefault(); e.stopImmediatePropagation(); submitRent();   return; }
    if (t.classList && t.classList.contains("option")) {
      e.preventDefault(); e.stopImmediatePropagation();
      var opts = t.parentNode ? t.parentNode.querySelectorAll(".option") : [];
      for (var i = 0; i < opts.length; i++) { if (opts[i] === t) { selectOption(i); return; } }
    }
    t = t.parentNode;
  }
}, {passive: false, capture: true});

window.addEventListener("click", function(e) {
  var t = e.target;
  while (t && t !== document.body) {
    if (t.id === "btn-start")       { startTest();    return; }
    if (t.id === "q-back")          { prevQuestion(); return; }
    if (t.id === "gate-btn")        { submitGate();   return; }
    if (t.id === "btn-restart")     { restart();      return; }
    if (t.id === "btn-submit-rent") { submitRent();   return; }
    if (t.classList && t.classList.contains("option")) {
      var opts = t.parentNode ? t.parentNode.querySelectorAll(".option") : [];
      for (var i = 0; i < opts.length; i++) { if (opts[i] === t) { selectOption(i); return; } }
    }
    t = t.parentNode;
  }
}, {capture: true});