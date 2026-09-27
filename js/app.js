(function () {
  "use strict";

  const wedding = window.WEDDING || {};
  const fields = {
    bride: wedding.bride,
    groom: wedding.groom,
    shortDate: wedding.shortDate,
    dayNumber: wedding.dayNumber,
    monthYear: wedding.monthYear,
    weekday: wedding.weekday,
    fullDate: wedding.fullDate,
    time: wedding.time,
    venue: wedding.venue
  };

  Object.keys(fields).forEach(function (key) {
    if (fields[key] === undefined) return;
    document.querySelectorAll('[data-field="' + key + '"]').forEach(function (element) {
      element.textContent = fields[key];
    });
  });

  const pageTitle = (wedding.bride || "") + " & " + (wedding.groom || "") + " · Wedding Invitation";
  document.title = pageTitle;
  const pageDescription = (wedding.bride || "") + " and " + (wedding.groom || "") + " invite you to celebrate their wedding on " + (wedding.fullDate || "their wedding day") + " at " + (wedding.venue || "their venue") + ".";
  const descriptionMeta = document.querySelector('meta[name="description"]');
  const ogTitleMeta = document.querySelector('meta[property="og:title"]');
  const ogDescriptionMeta = document.querySelector('meta[property="og:description"]');
  if (descriptionMeta) descriptionMeta.content = pageDescription;
  if (ogTitleMeta) ogTitleMeta.content = pageTitle;
  if (ogDescriptionMeta) ogDescriptionMeta.content = "With full hearts, we invite you to celebrate the beginning of our forever. " + (wedding.fullDate || "") + " · " + (wedding.venue || "") + ".";

  document.querySelectorAll("[data-photo]").forEach(function (image) {
    const photoPath = wedding[image.dataset.photo + "Photo"];
    if (photoPath) image.src = photoPath;
  });

  const audio = document.getElementById("weddingAudio");
  const musicToggle = document.getElementById("musicToggle");
  const musicLabel = musicToggle.querySelector(".music-label");
  if (wedding.music) audio.src = wedding.music;
  audio.volume = 0.48;

  function setMusicState(isPlaying) {
    musicToggle.classList.toggle("is-playing", isPlaying);
    musicToggle.setAttribute("aria-pressed", String(isPlaying));
    musicToggle.setAttribute("aria-label", isPlaying ? "Turn wedding music off" : "Turn wedding music on");
    musicLabel.textContent = isPlaying ? "Sound on" : "Sound off";
  }

  audio.addEventListener("play", function () { setMusicState(true); });
  audio.addEventListener("pause", function () { setMusicState(false); });
  musicToggle.addEventListener("click", function () {
    if (audio.paused) {
      audio.play().catch(function () { setMusicState(false); });
    } else {
      audio.pause();
    }
  });

  const cover = document.getElementById("cover");
  const openButton = document.getElementById("openInvitation");
  const invitation = document.getElementById("invitation");
  const autoScrollControl = document.getElementById("autoScrollControl");
  const autoScrollLabel = document.getElementById("autoScrollLabel");
  const stopAutoScrollButton = document.getElementById("stopAutoScroll");
  let autoScrollFrame = 0;
  let pendingAutoScroll = 0;
  let autoFlowCanceled = false;
  let opened = false;

  function stopAutoScroll(markCanceled) {
    if (autoScrollFrame) window.cancelAnimationFrame(autoScrollFrame);
    if (pendingAutoScroll) window.clearTimeout(pendingAutoScroll);
    autoScrollFrame = 0;
    pendingAutoScroll = 0;
    document.documentElement.style.scrollBehavior = "";
    autoScrollControl.hidden = true;
    if (markCanceled) autoFlowCanceled = true;
  }

  function glideTo(element, duration, label, onComplete) {
    if (!element || autoFlowCanceled || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const startY = window.scrollY;
    const targetY = Math.max(0, startY + element.getBoundingClientRect().top - 18);
    if (Math.abs(targetY - startY) < 20) {
      if (onComplete) onComplete();
      return;
    }
    const startedAt = performance.now();
    document.documentElement.style.scrollBehavior = "auto";
    autoScrollLabel.textContent = label;
    autoScrollControl.hidden = false;

    function frame(now) {
      if (autoFlowCanceled) return;
      const progress = Math.min(1, (now - startedAt) / duration);
      const eased = progress < .5 ? 4 * progress * progress * progress : 1 - Math.pow(-2 * progress + 2, 3) / 2;
      window.scrollTo(0, startY + (targetY - startY) * eased);
      if (progress < 1) {
        autoScrollFrame = window.requestAnimationFrame(frame);
      } else {
        autoScrollFrame = 0;
        document.documentElement.style.scrollBehavior = "";
        autoScrollControl.hidden = true;
        if (onComplete) onComplete();
      }
    }
    autoScrollFrame = window.requestAnimationFrame(frame);
  }

  function beginDateJourney() {
    if (autoFlowCanceled || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    pendingAutoScroll = window.setTimeout(function () {
      pendingAutoScroll = 0;
      glideTo(document.getElementById("the-day"), 6100, "Gliding to your date card", function () {
        autoScrollLabel.textContent = "Pause here and scratch the gold";
        autoScrollControl.hidden = false;
        window.setTimeout(function () { autoScrollControl.hidden = true; }, 4200);
      });
    }, 1650);
  }

  function beginAfterRevealJourney() {
    if (autoFlowCanceled || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    pendingAutoScroll = window.setTimeout(function () {
      pendingAutoScroll = 0;
      glideTo(document.getElementById("guestbook"), 14500, "Continuing the story", function () {
        autoScrollLabel.textContent = "Your turn — leave a little love";
        autoScrollControl.hidden = false;
        window.setTimeout(function () { autoScrollControl.hidden = true; }, 5000);
      });
    }, 1500);
  }

  stopAutoScrollButton.addEventListener("click", function () { stopAutoScroll(true); });
  function interruptOnGuestControl(event) {
    if (!opened) return;
    const target = event.target instanceof Element ? event.target : null;
    if (target && target.closest("#autoScrollControl, .music-toggle, #scratchCanvas, #revealDateButton")) return;
    autoFlowCanceled = true;
    if (autoScrollFrame || pendingAutoScroll) stopAutoScroll(true);
  }
  document.addEventListener("wheel", interruptOnGuestControl, { passive: true });
  document.addEventListener("touchstart", interruptOnGuestControl, { passive: true });
  document.addEventListener("pointerdown", interruptOnGuestControl, { passive: true });
  document.addEventListener("keydown", function (event) {
    if (["ArrowDown", "ArrowUp", "PageDown", "PageUp", "Home", "End", " "].includes(event.key)) interruptOnGuestControl(event);
  });

  openButton.addEventListener("click", function () {
    if (opened) return;
    opened = true;
    invitation.inert = false;
    invitation.setAttribute("aria-hidden", "false");
    document.body.classList.remove("is-locked");
    cover.classList.add("is-opening");
    openButton.blur();
    document.querySelector(".hero").setAttribute("tabindex", "-1");
    document.querySelector(".hero").focus({ preventScroll: true });
    audio.play().catch(function () { setMusicState(false); });
    window.setTimeout(updateScrollCue, 1100);
    beginDateJourney();
  });
  cover.addEventListener("transitionend", function (event) {
    if (event.propertyName === "transform" && cover.classList.contains("is-opening")) {
      cover.hidden = true;
    }
  });

  const mapButton = document.getElementById("mapButton");
  if (wedding.mapUrl) mapButton.href = wedding.mapUrl;

  const weddingMoment = Date.parse(wedding.dateTimeISO || "");
  const countdownParts = {
    days: document.getElementById("days"),
    hours: document.getElementById("hours"),
    minutes: document.getElementById("minutes"),
    seconds: document.getElementById("seconds")
  };
  const countdownNote = document.querySelector(".countdown-note");

  function twoDigits(value) {
    return String(value).padStart(2, "0");
  }

  function updateCountdown() {
    if (!Number.isFinite(weddingMoment)) return;
    const remaining = weddingMoment - Date.now();
    if (remaining <= 0) {
      Object.keys(countdownParts).forEach(function (key) { countdownParts[key].textContent = "00"; });
      countdownNote.textContent = "Today is the beginning of our forever.";
      return;
    }
    const days = Math.floor(remaining / 86400000);
    const hours = Math.floor((remaining % 86400000) / 3600000);
    const minutes = Math.floor((remaining % 3600000) / 60000);
    const seconds = Math.floor((remaining % 60000) / 1000);
    countdownParts.days.textContent = String(days);
    countdownParts.hours.textContent = twoDigits(hours);
    countdownParts.minutes.textContent = twoDigits(minutes);
    countdownParts.seconds.textContent = twoDigits(seconds);
  }
  updateCountdown();
  window.setInterval(updateCountdown, 1000);

  const scratchCanvas = document.getElementById("scratchCanvas");
  const scratchCard = document.getElementById("scratchCard");
  const revealButton = document.getElementById("revealDateButton");
  const dateReveal = document.getElementById("dateReveal");
  const scratchHint = document.getElementById("scratchHint");
  const scratchContext = scratchCanvas.getContext("2d", { willReadFrequently: true });
  let scratchDpr = 1;
  let lastPoint = null;
  let scratched = false;
  let revealed = false;
  let movementCount = 0;

  function paintScratchSurface(width, height) {
    const ctx = scratchContext;
    ctx.globalCompositeOperation = "source-over";
    const gold = ctx.createLinearGradient(0, 0, width, height);
    gold.addColorStop(0, "#967141");
    gold.addColorStop(0.18, "#e8cf98");
    gold.addColorStop(0.43, "#b08b52");
    gold.addColorStop(0.68, "#f2dfae");
    gold.addColorStop(1, "#8a673f");
    ctx.fillStyle = gold;
    ctx.fillRect(0, 0, width, height);

    const glow = ctx.createRadialGradient(width * .5, height * .34, 2, width * .5, height * .34, width * .72);
    glow.addColorStop(0, "rgba(255,248,222,.63)");
    glow.addColorStop(1, "rgba(255,248,222,0)");
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, width, height);

    ctx.save();
    ctx.strokeStyle = "rgba(255,247,219,.27)";
    ctx.lineWidth = 1;
    for (let x = 7; x < width; x += 15) {
      for (let y = 7; y < height; y += 15) {
        const size = ((x * 13 + y * 7) % 3) + .45;
        ctx.beginPath();
        ctx.arc(x, y, size, 0, Math.PI * 2);
        ctx.stroke();
      }
    }
    ctx.strokeStyle = "rgba(255,249,228,.61)";
    ctx.lineWidth = 1;
    ctx.strokeRect(17, 17, width - 34, height - 34);
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = "rgba(83,52,29,.84)";
    ctx.font = "italic 19px 'Cormorant Garamond', Georgia, serif";
    ctx.fillText("A little surprise", width / 2, height / 2 - 17);
    ctx.font = "600 8px 'DM Sans', Arial, sans-serif";
    ctx.letterSpacing = "2px";
    ctx.fillText("SCRATCH TO REVEAL", width / 2, height / 2 + 12);
    ctx.font = "18px Georgia, serif";
    ctx.fillStyle = "rgba(255,248,224,.9)";
    ctx.fillText("✳", width / 2, height / 2 + 39);
    ctx.restore();
  }

  function sizeScratchCanvas() {
    if (revealed) return;
    const bounds = scratchCanvas.getBoundingClientRect();
    if (!bounds.width || !bounds.height) return;
    const oldCanvas = document.createElement("canvas");
    if (scratchCanvas.width && scratched) {
      oldCanvas.width = scratchCanvas.width;
      oldCanvas.height = scratchCanvas.height;
      oldCanvas.getContext("2d").drawImage(scratchCanvas, 0, 0);
    }
    scratchDpr = Math.min(window.devicePixelRatio || 1, 2);
    scratchCanvas.width = Math.round(bounds.width * scratchDpr);
    scratchCanvas.height = Math.round(bounds.height * scratchDpr);
    scratchContext.setTransform(scratchDpr, 0, 0, scratchDpr, 0, 0);
    if (scratched && oldCanvas.width) {
      scratchContext.globalCompositeOperation = "source-over";
      scratchContext.drawImage(oldCanvas, 0, 0, bounds.width, bounds.height);
    } else {
      paintScratchSurface(bounds.width, bounds.height);
    }
  }

  function getPoint(event) {
    const bounds = scratchCanvas.getBoundingClientRect();
    return { x: event.clientX - bounds.left, y: event.clientY - bounds.top };
  }

  function eraseAt(point) {
    const ctx = scratchContext;
    ctx.globalCompositeOperation = "destination-out";
    ctx.fillStyle = "rgba(0,0,0,1)";
    ctx.beginPath();
    ctx.arc(point.x, point.y, 27, 0, Math.PI * 2);
    ctx.fill();
    if (lastPoint) {
      ctx.beginPath();
      ctx.lineWidth = 54;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.strokeStyle = "rgba(0,0,0,1)";
      ctx.moveTo(lastPoint.x, lastPoint.y);
      ctx.lineTo(point.x, point.y);
      ctx.stroke();
    }
    lastPoint = point;
    scratched = true;
    movementCount += 1;
    if (movementCount % 5 === 0) checkScratchProgress();
  }

  function checkScratchProgress() {
    if (revealed || !scratchCanvas.width || !scratchCanvas.height) return;
    const pixels = scratchContext.getImageData(0, 0, scratchCanvas.width, scratchCanvas.height).data;
    const step = Math.max(4, Math.round(8 * scratchDpr));
    let checked = 0;
    let cleared = 0;
    const rowStride = scratchCanvas.width * 4;
    for (let y = 0; y < scratchCanvas.height; y += step) {
      for (let x = 3; x < rowStride; x += step * 4) {
        checked += 1;
        if (pixels[y * rowStride + x] < 90) cleared += 1;
      }
    }
    if (checked && cleared / checked > .34) revealDate();
  }

  function revealDate() {
    if (revealed) return;
    revealed = true;
    scratchCard.classList.add("is-revealed");
    dateReveal.setAttribute("aria-hidden", "false");
    revealButton.setAttribute("aria-hidden", "true");
    scratchHint.textContent = "Our special day is revealed — save it close.";
    scratchHint.classList.add("is-revealed");
    document.getElementById("petalPop").classList.remove("is-popping");
    void document.getElementById("petalPop").offsetWidth;
    document.getElementById("petalPop").classList.add("is-popping");
    createPetalBurst();
    beginAfterRevealJourney();
  }

  scratchCanvas.addEventListener("pointerdown", function (event) {
    if (revealed) return;
    event.preventDefault();
    scratchCanvas.setPointerCapture(event.pointerId);
    lastPoint = null;
    eraseAt(getPoint(event));
  });
  scratchCanvas.addEventListener("pointermove", function (event) {
    if (revealed || !scratchCanvas.hasPointerCapture(event.pointerId)) return;
    event.preventDefault();
    eraseAt(getPoint(event));
  });
  scratchCanvas.addEventListener("pointerup", function (event) {
    if (scratchCanvas.hasPointerCapture(event.pointerId)) scratchCanvas.releasePointerCapture(event.pointerId);
    lastPoint = null;
    checkScratchProgress();
  });
  scratchCanvas.addEventListener("pointercancel", function () { lastPoint = null; });
  revealButton.addEventListener("click", revealDate);
  sizeScratchCanvas();
  window.addEventListener("resize", sizeScratchCanvas, { passive: true });

  function createPetalBurst() {
    const burst = document.getElementById("petalBurst");
    const colors = ["#b9a06b", "#e6dac0", "#cbd3bd", "#f1e3bf", "#859578"];
    for (let i = 0; i < 21; i += 1) {
      const petal = document.createElement("span");
      const angle = (Math.PI * 2 * i) / 21;
      const distance = 70 + Math.random() * 220;
      petal.textContent = i % 4 === 0 ? "❋" : "✿";
      petal.style.setProperty("--x", Math.cos(angle) * distance + "px");
      petal.style.setProperty("--y", Math.sin(angle) * distance - 35 + "px");
      petal.style.setProperty("--rot", Math.round(Math.random() * 270 - 135) + "deg");
      petal.style.setProperty("--delay", Math.random() * .2 + "s");
      petal.style.setProperty("--petal-color", colors[i % colors.length]);
      burst.appendChild(petal);
      window.setTimeout(function () { petal.remove(); }, 2200);
    }
  }

  const revealItems = document.querySelectorAll(".reveal");
  if ("IntersectionObserver" in window) {
    const revealObserver = new IntersectionObserver(function (entries, observer) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("is-visible");
        observer.unobserve(entry.target);
      });
    }, { threshold: .13, rootMargin: "0px 0px -28px 0px" });
    revealItems.forEach(function (element) { revealObserver.observe(element); });
  } else {
    revealItems.forEach(function (element) { element.classList.add("is-visible"); });
  }

  const scrollCue = document.querySelector(".scroll-cue");
  function updateScrollCue() {
    if (!opened) return;
    const nearBottom = window.scrollY + window.innerHeight > document.documentElement.scrollHeight - 80;
    scrollCue.classList.toggle("is-visible", window.scrollY > 130 && !nearBottom);
  }
  window.addEventListener("scroll", updateScrollCue, { passive: true });
  window.addEventListener("resize", updateScrollCue, { passive: true });

  const shareButton = document.getElementById("shareButton");
  shareButton.addEventListener("click", async function () {
    const inviteUrl = wedding.publicUrl || window.location.href;
    const shareData = {
      title: document.title,
      text: "We'd love for you to celebrate with us on " + (wedding.fullDate || "our wedding day") + ".",
      url: inviteUrl
    };
    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch (error) {
        if (error && error.name !== "AbortError") copyInviteLink(inviteUrl);
      }
      return;
    }
    copyInviteLink(inviteUrl);
  });

  function copyInviteLink(inviteUrl) {
    if (!navigator.clipboard || !navigator.clipboard.writeText) return;
    navigator.clipboard.writeText(inviteUrl).then(function () {
      const oldLabel = shareButton.innerHTML;
      shareButton.innerHTML = "<span aria-hidden='true'>✓</span> Link copied";
      window.setTimeout(function () { shareButton.innerHTML = oldLabel; }, 2200);
    }).catch(function () {});
  }

  const guestbookForm = document.getElementById("guestbookForm");
  const guestbookStatus = document.getElementById("guestbookStatus");
  const greetingsList = document.getElementById("greetingsList");
  const greetingsEmpty = document.getElementById("greetingsEmpty");
  const sendWishesButton = document.getElementById("sendWishesButton");
  const guestbookEndpoint = wedding.guestbookApi;

  function renderGreetings(greetings) {
    greetingsList.replaceChildren();
    const entries = Array.isArray(greetings) ? greetings.slice(0, 300) : [];
    greetingsEmpty.hidden = entries.length > 0;
    entries.forEach(function (greeting) {
      const item = document.createElement("li");
      item.className = "greeting-card";
      const header = document.createElement("div");
      header.className = "greeting-card-header";
      const author = document.createElement("p");
      author.className = "greeting-author";
      author.textContent = greeting.name || "A wedding guest";
      const timestamp = document.createElement("time");
      timestamp.className = "greeting-time";
      if (greeting.createdAt) {
        const date = new Date(greeting.createdAt);
        if (!Number.isNaN(date.getTime())) {
          timestamp.dateTime = date.toISOString();
          timestamp.textContent = new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(date);
        }
      }
      header.append(author, timestamp);
      const message = document.createElement("p");
      message.className = "greeting-message";
      message.textContent = greeting.message || "";
      item.append(header, message);
      greetingsList.appendChild(item);
    });
  }

  async function loadGreetings() {
    if (!guestbookEndpoint) {
      guestbookStatus.textContent = "Set a guestbook API endpoint in js/wedding.js to share greetings with everyone.";
      return;
    }
    try {
      const response = await fetch(guestbookEndpoint, { headers: { Accept: "application/json" }, cache: "no-store" });
      if (!response.ok) throw new Error("Guestbook unavailable");
      const payload = await response.json();
      renderGreetings(payload.greetings || []);
      guestbookStatus.textContent = "Your greeting will be visible to everyone who visits this invitation.";
    } catch (error) {
      guestbookStatus.textContent = "The shared guestbook is offline. Host this invitation with the included server to collect and show greetings to everyone.";
    }
  }

  guestbookForm.addEventListener("submit", async function (event) {
    event.preventDefault();
    if (!guestbookEndpoint) return;
    const formData = new FormData(guestbookForm);
    const messageData = {
      name: String(formData.get("name") || "").trim(),
      message: String(formData.get("message") || "").trim(),
      website: String(formData.get("website") || "").trim()
    };
    if (!messageData.name || !messageData.message) {
      guestbookStatus.textContent = "Please add your name and a short greeting.";
      return;
    }

    sendWishesButton.disabled = true;
    sendWishesButton.classList.add("is-sending");
    guestbookStatus.textContent = "Sending your wish…";
    try {
      const response = await fetch(guestbookEndpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify(messageData)
      });
      const result = await response.json().catch(function () { return {}; });
      if (!response.ok) {
        if (response.status === 429) throw new Error("Please wait a little before sending another wish.");
        throw new Error(result.error || "Your wish could not be sent just now.");
      }
      guestbookForm.reset();
      guestbookStatus.textContent = "Your wish is now part of our shared guestbook. Thank you.";
      await loadGreetings();
      guestbookStatus.textContent = "Your wish is now part of our shared guestbook. Thank you.";
    } catch (error) {
      guestbookStatus.textContent = error.message || "Unable to send your wish right now. Please try again.";
    } finally {
      sendWishesButton.disabled = false;
      sendWishesButton.classList.remove("is-sending");
    }
  });

  loadGreetings();
})();
