/* Logic của trang khảo sát. Nội dung câu hỏi nằm ở questions.js — thường không cần sửa file này. */
(function () {
  "use strict";

  const S = window.SURVEY;
  const SCRIPT_URL = ((window.SURVEY_CONFIG || {}).scriptUrl || "").trim();

  const KEY_PROGRESS = "ksbds-dang-lam-v1";
  const KEY_DONE = "ksbds-da-gui-v1";
  const KEY_TEST = "ksbds-ban-thu-v1";
  const HIDDEN = "(không hiển thị)";
  const OTHER_RE = /\(ghi rõ\)/i;
  const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
  const AUTO_ADVANCE_MS = 320;
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // Trình duyệt có thể chặn lưu (chế độ ẩn danh…): khảo sát vẫn chạy, chỉ không nhớ được bài làm dở.
  const storage = {
    get(key) { try { return JSON.parse(localStorage.getItem(key)); } catch (e) { return null; } },
    set(key, value) { try { localStorage.setItem(key, JSON.stringify(value)); } catch (e) { /* bỏ qua */ } },
    remove(key) { try { localStorage.removeItem(key); } catch (e) { /* bỏ qua */ } },
  };

  function el(tag, attrs, ...children) {
    const node = document.createElement(tag);
    for (const key in attrs || {}) {
      const value = attrs[key];
      if (value == null || value === false) continue;
      if (key === "class") node.className = value;
      else if (key.startsWith("on")) node.addEventListener(key.slice(2), value);
      else node.setAttribute(key, value === true ? "" : value);
    }
    for (const child of children.flat()) {
      if (child == null || child === false) continue;
      node.append(child instanceof Node ? child : document.createTextNode(child));
    }
    return node;
  }

  /* ---------- Danh sách màn hình: mỗi phần có 1 màn mở đầu, rồi từng câu ---------- */
  const steps = [];
  const qById = {};
  S.cacPhan.forEach((phan) => {
    steps.push({ kind: "chapter", phan });
    phan.cauHoi.forEach((q) => {
      q.phan = phan;
      qById[q.ma] = q;
      steps.push({ kind: "question", q, phan });
    });
  });
  // Nếu bộ câu hỏi thay đổi thì bỏ bài làm dở cũ (vị trí câu không còn khớp).
  const SIGNATURE = steps.map((s) => (s.q ? s.q.ma : "#" + s.phan.ma)).join(",");
  const emailQ = steps.map((s) => s.q).find((q) => q && q.loai === "email");

  let state = freshState();
  let view = "intro";
  let screenToken = 0;
  let advanceTimer = null;
  let onNext = null;
  let send = null;

  function freshState() {
    return { answers: {}, pos: -1, history: [], startedAt: null };
  }

  function save() {
    storage.set(KEY_PROGRESS, Object.assign({ sig: SIGNATURE }, state));
  }

  /* ---------- Rẽ nhánh ---------- */
  function answerOf(id) {
    const q = qById[id];
    if (!q || !questionVisible(q)) return undefined;
    return currentValue(q);
  }

  function matches(rule) {
    return rule.la.includes(answerOf(rule.cau));
  }

  function questionVisible(q) {
    if (q.chiHienKhi && !matches(q.chiHienKhi)) return false;
    if (q.anKhi && matches(q.anKhi)) return false;
    return true;
  }

  function stepVisible(step) {
    return step.kind === "chapter" ? step.phan.cauHoi.some(questionVisible) : questionVisible(step.q);
  }

  function nextVisible(from) {
    for (let i = from + 1; i < steps.length; i++) if (stepVisible(steps[i])) return i;
    return -1;
  }

  function effectiveAnswers() {
    const out = {};
    for (const id in qById) out[id] = answerOf(id);
    return out;
  }

  /* ---------- Lựa chọn và giá trị ---------- */
  function sourceOptions(q) {
    return q.layLuaChonTu ? qById[q.layLuaChonTu].luaChon : q.luaChon || [];
  }

  function optionsFor(q) {
    if (q.loai === "thang5") return S.thangDiem.map((text, i) => ({ value: i + 1, text, num: i + 1 }));
    let list = sourceOptions(q);
    if (q.layLuaChonTu) {
      const picked = answerOf(q.layLuaChonTu);
      if (Array.isArray(picked) && picked.length) list = list.filter((o) => picked.includes(o));
    }
    return list.map((text) => ({ value: text, text, other: OTHER_RE.test(text) }));
  }

  // Giá trị đang lưu, bỏ đi nếu không còn khớp lựa chọn (ví dụ B5 sau khi sửa lại B4).
  function currentValue(q) {
    const v = state.answers[q.ma];
    if (q.layLuaChonTu && v !== undefined && !optionsFor(q).some((o) => o.value === v)) return undefined;
    return v;
  }

  function hasValue(v) {
    if (Array.isArray(v)) return v.length > 0;
    if (typeof v === "number") return true;
    return typeof v === "string" && v.trim() !== "";
  }

  function hasOtherOption(q) {
    return q.loai !== "thang5" && sourceOptions(q).some((o) => OTHER_RE.test(o));
  }

  // Các lựa chọn đã tick ở câu nguồn (ví dụ C9), theo đúng thứ tự trong danh sách.
  function perOptionLabels(q) {
    const src = qById[q.moiLuaChonMotO];
    const picked = answerOf(q.moiLuaChonMotO);
    return Array.isArray(picked) ? sourceOptions(src).filter((o) => picked.includes(o)) : [];
  }

  function perOptionStore(q) {
    const key = q.ma + "__theoLuaChon";
    if (!state.answers[key]) state.answers[key] = {};
    return state.answers[key];
  }

  function displayLabel(srcId, label) {
    const otherText = (state.answers[srcId + "__ghiRo"] || "").trim();
    return OTHER_RE.test(label) && otherText ? "Khác: " + otherText : label;
  }

  function hintFor(q) {
    if (q.ghiChu) return q.ghiChu;
    if (q.moiLuaChonMotO && perOptionLabels(q).length) return "Trả lời ngắn cho từng vị trí";
    if (q.loai === "chon1") return "Chọn 1 đáp án";
    if (q.loai === "chonNhieu") return q.toiDa ? "Chọn tối đa " + q.toiDa : "Chọn nhiều đáp án";
    if (q.loai === "thang5") return "Mức độ đồng ý của bạn";
    return "Trả lời ngắn";
  }

  /* ---------- Điều hướng ---------- */
  const stageEl = document.getElementById("stage");
  const progressEl = document.getElementById("progress");
  const btnBack = document.getElementById("btnBack");
  const btnNext = document.getElementById("btnNext");

  btnNext.addEventListener("click", () => onNext && onNext());
  btnBack.addEventListener("click", goBack);

  // Nút "quay lại" của điện thoại cũng lùi một câu thay vì rời trang.
  window.addEventListener("popstate", () => {
    if (view !== "step") return;
    goBack();
    if (view === "step") history.pushState({ ks: 1 }, "");
  });

  function setNav({ back, label, ghost, action }) {
    btnBack.hidden = !back;
    btnNext.textContent = label;
    btnNext.className = "btn " + (ghost ? "btn-ghost" : "btn-primary");
    onNext = action;
  }

  function start(fresh) {
    if (fresh) state = freshState();
    if (state.pos < 0) {
      state.history = [-1];
      state.pos = nextVisible(-1);
    }
    if (!state.startedAt) state.startedAt = Date.now();
    save();
    history.pushState({ ks: 1 }, "");
    showStep("forward");
  }

  function goNext() {
    const next = nextVisible(state.pos);
    if (next === -1) return;
    state.history.push(state.pos);
    state.pos = next;
    save();
    showStep("forward");
  }

  function goBack() {
    while (state.history.length) {
      const prev = state.history.pop();
      if (prev === -1) break;
      if (stepVisible(steps[prev])) {
        state.pos = prev;
        save();
        showStep("back");
        return;
      }
    }
    state.pos = -1;
    state.history = [];
    save();
    showIntro("back");
  }

  function mount(screen, dir) {
    screenToken++;
    clearTimeout(advanceTimer);
    stageEl.querySelectorAll(".leaving").forEach((n) => n.remove());
    const old = stageEl.firstElementChild;
    screen.classList.add("screen");
    if (old && dir && !reduceMotion) {
      old.classList.add("leaving", dir === "back" ? "out-right" : "out-left");
      screen.classList.add(dir === "back" ? "in-left" : "in-right");
      stageEl.append(screen);
      setTimeout(() => old.remove(), 240);
    } else {
      stageEl.replaceChildren(screen);
    }
    window.scrollTo(0, 0);
    const focusTarget = screen.querySelector("[data-focus]");
    if (focusTarget) focusTarget.focus({ preventScroll: true });
  }

  /* ---------- Thanh tiến trình ---------- */
  function buildProgress() {
    const segs = el("ol", { class: "segs" }, [1, 2, 3].map((g) =>
      el("li", { class: "seg", "data-g": g },
        el("div", { class: "bar" }, el("span", { class: "fill" })),
        el("div", { class: "lbl" }, el("small", null, "Giai đoạn " + g), el("b", null, S.cacGiaiDoan[g])))));
    progressEl.append(segs, el("p", { class: "sr-only", id: "progressText", "aria-live": "polite" }));
  }

  function renderProgress(mode) {
    const cur = mode === "step" ? steps[state.pos].phan.giaiDoan : 0;
    progressEl.querySelectorAll(".seg").forEach((li) => {
      const g = Number(li.dataset.g);
      let fill = 0;
      if (mode === "result" || g < cur) fill = 1;
      else if (g === cur) {
        const inStage = [];
        steps.forEach((s, i) => {
          if (s.kind === "question" && s.phan.giaiDoan === g && questionVisible(s.q)) inStage.push(i);
        });
        const done = inStage.filter((i) => i < state.pos).length;
        fill = Math.max(0.04, inStage.length ? done / inStage.length : 0);
      }
      li.querySelector(".fill").style.width = fill * 100 + "%";
      li.classList.toggle("active", g === cur);
    });
    const text = cur ? "Đang ở Giai đoạn " + cur + " – " + S.cacGiaiDoan[cur] : "";
    const sr = document.getElementById("progressText");
    if (sr.textContent !== text) sr.textContent = text;
  }

  /* ---------- Màn hình mở đầu ---------- */
  function showIntro(dir) {
    view = "intro";
    renderProgress("intro");
    const L = S.loiMoDau;
    const resumable = state.pos >= 0 || Object.keys(state.answers).length > 0;
    const screen = el("section", { class: "intro" },
      el("p", { class: "kicker" }, "Khảo sát ẩn danh · " + S.thoiGian),
      el("h1", { class: "title title-xl", tabindex: "-1", "data-focus": true }, S.tieuDe),
      el("p", { class: "lead" }, L.chao),
      el("ul", { class: "bullets" }, L.gachDau.map((t) => el("li", null, t))),
      el("p", { class: "card note" }, L.thangDiem),
      resumable && el("button", {
        type: "button",
        class: "link-btn",
        onclick: () => { if (confirm("Xóa câu trả lời đang làm dở và làm lại từ đầu?")) start(true); },
      }, "Làm lại từ đầu"));
    mount(screen, dir);
    setNav({ back: false, label: resumable ? "Tiếp tục bài đang làm" : "Bắt đầu", action: () => start(false) });
  }

  /* ---------- Màn hình câu hỏi ---------- */
  function showStep(dir) {
    view = "step";
    const step = steps[state.pos];
    renderProgress("step");
    if (step.kind === "chapter") showChapter(step.phan, dir);
    else showQuestion(step.q, dir);
  }

  function showChapter(phan, dir) {
    const screen = el("section", { class: "chapter" },
      el("span", { class: "badge" }, phan.nhan),
      el("h2", { class: "title title-xl", tabindex: "-1", "data-focus": true }, phan.ten),
      phan.moTa && el("p", { class: "lead muted" }, phan.moTa));
    mount(screen, dir);
    setNav({ back: true, label: "Tiếp tục", action: goNext });
  }

  function showQuestion(q, dir) {
    const isLast = nextVisible(state.pos) === -1;
    const titleId = "qt-" + q.ma;
    const labels = q.moiLuaChonMotO ? perOptionLabels(q) : [];
    const title = q.moiLuaChonMotO && !labels.length ? q.tieuDeKhiKhongChon || q.tieuDe : q.tieuDe;
    const screen = el("section", { class: "question" },
      el("p", { class: "kicker" }, q.phan.ten),
      el("h2", { class: "title", id: titleId, tabindex: "-1", "data-focus": true }, title),
      el("p", { class: "hint", id: "qh-" + q.ma }, hintFor(q)));

    const refresh = () => {
      if (isLast) return setNav({ back: true, label: "Gửi câu trả lời", action: () => finish(screen) });
      const answered = labels.length
        ? labels.some((l) => hasValue(perOptionStore(q)[l]))
        : hasValue(currentValue(q));
      setNav({ back: true, label: answered ? "Tiếp" : "Bỏ qua", ghost: !answered, action: goNext });
    };

    if (q.loai === "chon1" || q.loai === "thang5") screen.append(singleChoice(q, titleId, refresh, isLast));
    else if (q.loai === "chonNhieu") screen.append(...multiChoice(q, titleId, refresh));
    else if (q.loai === "email") screen.append(...emailField(q, titleId));
    else if (labels.length) screen.append(perOptionFields(q, labels, refresh));
    else screen.append(textField(q, titleId, refresh));

    mount(screen, dir);
    refresh();
  }

  function optionButton(o, role) {
    return el("button", { type: "button", class: "opt", role },
      o.num
        ? el("span", { class: "num", "aria-hidden": "true" }, String(o.num))
        : el("span", { class: "mark " + (role === "radio" ? "radio" : "check"), "aria-hidden": "true" }),
      el("span", null, o.text));
  }

  function otherField(q) {
    const key = q.ma + "__ghiRo";
    // B5 lấy sẵn phần "ghi rõ" đã gõ ở B4
    if (state.answers[key] === undefined && q.layLuaChonTu) {
      const fromSource = state.answers[q.layLuaChonTu + "__ghiRo"];
      if (fromSource) state.answers[key] = fromSource;
    }
    const input = el("input", {
      type: "text", class: "field other-input", placeholder: "Ghi rõ…", maxlength: "300", "aria-label": "Ghi rõ",
    });
    input.value = state.answers[key] || "";
    input.addEventListener("input", () => { state.answers[key] = input.value; save(); });
    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter") { e.preventDefault(); btnNext.click(); }
    });
    return input;
  }

  function singleChoice(q, titleId, refresh, isLast) {
    const list = el("div", { class: "options", role: "radiogroup", "aria-labelledby": titleId });
    const rows = [];
    let otherInput = null;

    optionsFor(q).forEach((o) => {
      const btn = optionButton(o, "radio");
      btn.addEventListener("click", () => pick(o));
      rows.push([btn, o]);
      list.append(btn);
      if (o.other) {
        otherInput = otherField(q);
        list.append(otherInput);
      }
    });

    function sync() {
      const cur = currentValue(q);
      rows.forEach(([btn, o]) => btn.setAttribute("aria-checked", String(o.value === cur)));
      if (otherInput) otherInput.hidden = !rows.some(([, o]) => o.other && o.value === cur);
    }

    function pick(o) {
      state.answers[q.ma] = o.value;
      save();
      sync();
      refresh();
      clearTimeout(advanceTimer);
      if (o.other) { otherInput.focus(); return; }
      if (isLast) return;
      const token = screenToken;
      advanceTimer = setTimeout(() => { if (token === screenToken) goNext(); }, AUTO_ADVANCE_MS);
    }

    sync();
    return list;
  }

  function multiChoice(q, titleId, refresh) {
    const max = q.toiDa || 0;
    const exclusive = q.luaChonDuyNhat || [];
    const list = el("div", { class: "options", role: "group", "aria-labelledby": titleId });
    const counter = max ? el("p", { class: "counter", "aria-live": "polite" }) : null;
    const rows = [];
    let otherInput = null;
    const selected = () => state.answers[q.ma] || [];

    optionsFor(q).forEach((o) => {
      const btn = optionButton(o, "checkbox");
      btn.addEventListener("click", () => toggle(o));
      rows.push([btn, o]);
      list.append(btn);
      if (o.other) {
        otherInput = otherField(q);
        list.append(otherInput);
      }
    });

    function sync() {
      const sel = selected();
      const full = max > 0 && sel.length >= max;
      rows.forEach(([btn, o]) => {
        const on = sel.includes(o.value);
        btn.setAttribute("aria-checked", String(on));
        btn.setAttribute("aria-disabled", String(full && !on));
      });
      if (otherInput) otherInput.hidden = !sel.some((v) => OTHER_RE.test(v));
      if (counter) {
        counter.classList.remove("warn");
        counter.textContent = "Đã chọn " + sel.length + "/" + max;
      }
    }

    function toggle(o) {
      let sel = selected().slice();
      if (sel.includes(o.value)) {
        sel = sel.filter((v) => v !== o.value);
      } else {
        sel = exclusive.includes(o.value) ? [] : sel.filter((v) => !exclusive.includes(v));
        if (max && sel.length >= max) return warnMax();
        sel.push(o.value);
      }
      if (sel.length) state.answers[q.ma] = sel;
      else delete state.answers[q.ma];
      save();
      sync();
      refresh();
      if (o.other && sel.includes(o.value)) otherInput.focus();
    }

    function warnMax() {
      counter.textContent = "Bạn chỉ chọn được tối đa " + max + ". Bỏ bớt một lựa chọn để đổi.";
      counter.classList.remove("warn");
      void counter.offsetWidth; // chạy lại hiệu ứng rung
      counter.classList.add("warn");
    }

    sync();
    return counter ? [counter, list] : [list];
  }

  function textField(q, titleId, refresh) {
    const area = el("textarea", {
      class: "field", rows: "4", maxlength: "1500", placeholder: "Nhập câu trả lời của bạn…", "aria-labelledby": titleId,
    });
    area.value = state.answers[q.ma] || "";
    area.addEventListener("input", () => { state.answers[q.ma] = area.value; save(); refresh(); });
    return area;
  }

  function perOptionFields(q, labels, refresh) {
    const store = perOptionStore(q);
    const wrap = el("div", { class: "per-option" });
    labels.forEach((label) => {
      const area = el("textarea", { class: "field", rows: "3", maxlength: "1000", placeholder: "Câu bạn muốn hỏi…" });
      area.value = store[label] || "";
      area.addEventListener("input", () => { store[label] = area.value; save(); refresh(); });
      wrap.append(el("label", { class: "per-option-item" },
        el("span", { class: "per-option-label" }, displayLabel(q.moiLuaChonMotO, label)), area));
    });
    return wrap;
  }

  function emailField(q, titleId) {
    const input = el("input", {
      type: "email", class: "field", inputmode: "email", autocomplete: "email", maxlength: "254",
      placeholder: "ten@email.com", "aria-labelledby": titleId, "aria-describedby": "qh-" + q.ma,
    });
    const error = el("p", { class: "error", role: "alert", hidden: true });
    input.value = state.answers[q.ma] || "";
    input.addEventListener("input", () => { state.answers[q.ma] = input.value; error.hidden = true; save(); });
    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter") { e.preventDefault(); btnNext.click(); }
    });
    return [input, error];
  }

  /* ---------- Gửi câu trả lời ---------- */
  function finish(screen) {
    const email = emailQ ? String(answerOf(emailQ.ma) || "").trim() : "";
    if (email && !EMAIL_RE.test(email)) {
      const error = screen.querySelector(".error");
      error.textContent = "Email chưa đúng định dạng. Bạn có thể sửa lại, hoặc xóa trống để gửi không kèm email.";
      error.hidden = false;
      return;
    }
    const giaiDoan = S.tinhGiaiDoan(effectiveAnswers());
    send = { row: buildRow(giaiDoan), email, giaiDoan, answersSent: false, emailSent: false };
    showResult(giaiDoan, "forward", false);
    trySend();
  }

  // Một dòng cho sheet "CauTraLoi". Không chứa email.
  function buildRow(giaiDoan) {
    const columns = ["Giai đoạn (kết quả)", "Thời lượng (phút)"];
    const values = [giaiDoan, Math.round((Date.now() - (state.startedAt || Date.now())) / 6000) / 10];
    steps.forEach(({ q }) => {
      if (!q || q.loai === "email") return;
      const visible = questionVisible(q);
      const v = currentValue(q);
      if (q.moiLuaChonMotO) {
        // Cột C8 cho ô chung, rồi mỗi lựa chọn của C9 một cột "C8 – <vị trí>".
        const labels = visible ? perOptionLabels(q) : [];
        const store = perOptionStore(q);
        columns.push(q.ma);
        values.push(!visible ? HIDDEN : labels.length ? "(trả lời theo vị trí)" : formatValue(q, v));
        sourceOptions(qById[q.moiLuaChonMotO]).forEach((opt) => {
          columns.push(q.ma + " – " + opt);
          values.push(!visible ? HIDDEN : labels.includes(opt) ? (store[opt] || "").trim() : "");
        });
        return;
      }
      columns.push(q.ma);
      values.push(!visible ? HIDDEN : formatValue(q, v));
      if (hasOtherOption(q)) {
        const picked = [].concat(v || []);
        const otherText = picked.some((x) => OTHER_RE.test(x)) ? (state.answers[q.ma + "__ghiRo"] || "").trim() : "";
        columns.push(q.ma + " – ghi rõ");
        values.push(!visible ? HIDDEN : otherText);
      }
    });
    return { columns, values };
  }

  function formatValue(q, v) {
    if (!hasValue(v)) return "";
    if (Array.isArray(v)) {
      const order = sourceOptions(q);
      return v.slice().sort((a, b) => order.indexOf(a) - order.indexOf(b)).join("; ");
    }
    return typeof v === "string" ? v.trim() : v;
  }

  async function post(body) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 20000);
    try {
      const res = await fetch(SCRIPT_URL, {
        method: "POST",
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify(body),
        signal: controller.signal,
      });
      if (!res.ok) throw new Error("HTTP " + res.status);
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || "Máy chủ báo lỗi");
    } finally {
      clearTimeout(timer);
    }
  }

  async function trySend() {
    setStatus("sending");
    try {
      if (!SCRIPT_URL) {
        const all = storage.get(KEY_TEST) || [];
        all.push(send.row);
        storage.set(KEY_TEST, all);
        console.info("[Bản chạy thử] Dòng sẽ ghi vào sheet CauTraLoi:", send.row);
        if (send.email) console.info("[Bản chạy thử] Email sẽ ghi riêng vào sheet Email:", send.email);
        setStatus("test");
      } else {
        if (!send.answersSent) {
          await post({ kind: "answers", columns: send.row.columns, values: send.row.values });
          send.answersSent = true;
        }
        if (send.email && !send.emailSent) {
          await post({ kind: "email", email: send.email });
          send.emailSent = true;
        }
        setStatus("ok");
      }
      storage.set(KEY_DONE, { giaiDoan: send.giaiDoan });
      storage.remove(KEY_PROGRESS);
    } catch (err) {
      console.error(err);
      setStatus("error");
    }
  }

  function setStatus(kind) {
    const box = document.getElementById("sendStatus");
    if (!box) return;
    box.className = "status " + kind;
    const messages = {
      sending: [el("span", { class: "spinner", "aria-hidden": "true" }), "Đang gửi câu trả lời…"],
      ok: ["✓ Đã lưu câu trả lời của bạn."],
      test: ["Bản chạy thử: chưa kết nối Google Sheets, câu trả lời chỉ lưu tạm trên máy này."],
      done: ["Bạn đã hoàn thành khảo sát này rồi."],
      error: [
        "Chưa gửi được câu trả lời. Kiểm tra kết nối mạng rồi thử lại nhé.",
        el("button", { type: "button", class: "btn btn-primary", onclick: trySend }, "Gửi lại"),
      ],
    };
    box.replaceChildren(...messages[kind]);
  }

  /* ---------- Màn hình kết quả ---------- */
  function showResult(giaiDoan, dir, alreadyDone) {
    view = "result";
    renderProgress("result");
    const R = S.ketQua;
    const info = R.giaiDoan[giaiDoan];
    const tracker = el("ol", { class: "tracker", "aria-label": "Ba giai đoạn" }, [1, 2, 3].map((n) =>
      el("li", { class: n < giaiDoan ? "past" : n === giaiDoan ? "current" : null, "aria-current": n === giaiDoan ? "step" : null },
        el("span", { class: "dot" }, String(n)),
        el("span", { class: "tname" }, S.cacGiaiDoan[n]))));
    const screen = el("section", { class: "result" },
      el("p", { class: "kicker" }, "Kết quả của bạn"),
      el("h1", { class: "title title-xl", tabindex: "-1", "data-focus": true }, "Bạn đang ở ", el("span", { class: "hl" }, info.ten)),
      tracker,
      el("p", { class: "lead" }, info.moDau),
      el("h2", { class: "subhead" }, "Gợi ý cho bạn"),
      el("ol", { class: "tips" }, info.goiY.map((t) => el("li", null, t))),
      el("p", { class: "disclaimer" }, R.luuY),
      el("div", { class: "status", id: "sendStatus", role: "status" }),
      el("p", { class: "thanks" }, S.loiCamOn));
    mount(screen, dir);
    setNav({ back: false, label: "Chia sẻ khảo sát cho bạn bè", action: share });
    if (alreadyDone) setStatus("done");
  }

  async function share() {
    const url = location.origin + location.pathname;
    if (navigator.share) {
      try { await navigator.share({ title: S.tieuDe, text: S.loiMoiChiaSe, url }); } catch (e) { /* người dùng đóng bảng chia sẻ */ }
      return;
    }
    try {
      await navigator.clipboard.writeText(url);
      toast("Đã sao chép link khảo sát");
    } catch (e) {
      window.prompt("Sao chép link này để gửi bạn bè:", url);
    }
  }

  function toast(text) {
    const t = el("div", { class: "toast", role: "status" }, text);
    document.body.append(t);
    setTimeout(() => t.remove(), 2200);
  }

  /* ---------- Khởi động ---------- */
  function init() {
    if (new URLSearchParams(location.search).has("lamlai")) {
      storage.remove(KEY_PROGRESS);
      storage.remove(KEY_DONE);
      history.replaceState(null, "", location.pathname);
    }
    if (!SCRIPT_URL) {
      progressEl.before(el("p", { class: "test-banner" }, "Bản chạy thử – chưa kết nối Google Sheets"));
    }
    buildProgress();

    const done = storage.get(KEY_DONE);
    if (done && S.ketQua.giaiDoan[done.giaiDoan]) return showResult(done.giaiDoan, null, true);

    const saved = storage.get(KEY_PROGRESS);
    if (saved && saved.sig === SIGNATURE && saved.answers) {
      state = { answers: saved.answers, pos: saved.pos, history: saved.history || [], startedAt: saved.startedAt };
      if (state.pos >= steps.length) state = freshState();
    }
    showIntro(null);
  }

  init();
})();
