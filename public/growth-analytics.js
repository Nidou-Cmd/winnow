/**
 * Growth, Analytics & Retention Engine for Winnow (AWS Cloud Cost Optimization)
 * Integrates PostHog, Chatwoot Live Chat, Lead Capture & Exit Intent Modal
 */

(function () {
  console.log('[Winnow Growth Stack] Initialized.');

  // 1. PostHog Event Tracking Helper
  window.trackGrowthEvent = function (eventName, properties) {
    if (window.posthog) {
      window.posthog.capture(eventName, Object.assign({ app: 'winnow' }, properties));
    } else {
      console.log('[Growth Event Winnow]', eventName, properties);
    }
  };

  // 2. Chatwoot Support Integration
  var chatwootToken = window.CHATWOOT_TOKEN || '';
  var chatwootUrl = window.CHATWOOT_URL || 'https://app.chatwoot.com';
  if (chatwootToken) {
    (function (d, t) {
      var g = d.createElement(t), s = d.getElementsByTagName(t)[0];
      g.src = chatwootUrl + '/packs/js/sdk.js';
      g.defer = true; g.async = true;
      s.parentNode.insertBefore(g, s);
      g.onload = function () {
        window.chatwootSDK.run({ websiteToken: chatwootToken, baseUrl: chatwootUrl });
      };
    })(document, 'script');
  }

  // 3. Exit-Intent Modal Injector
  var exitModalShown = false;
  document.addEventListener('mouseleave', function (e) {
    if (e.clientY <= 10 && !exitModalShown && !localStorage.getItem('winnow_exit_modal_shown')) {
      exitModalShown = true;
      localStorage.setItem('winnow_exit_modal_shown', 'true');
      showExitModal();
    }
  });

  function showExitModal() {
    var modalHtml = `
      <div id="winnow-exit-modal" style="position:fixed;inset:0;background:rgba(0,0,0,0.85);z-index:9999;display:flex;align-items:center;justify-content:center;padding:20px;">
        <div style="background:#090d16;border:1px solid #1e293b;border-radius:16px;max-width:440px;width:100%;padding:28px;color:#fff;position:relative;box-shadow:0 25px 50px -12px rgba(0,0,0,0.7);">
          <button id="winnow-close-exit-modal" style="position:absolute;top:16px;right:16px;background:none;border:none;color:#64748b;font-size:20px;cursor:pointer;">✕</button>
          <div style="display:inline-block;padding:4px 12px;background:rgba(56,189,248,0.15);color:#38bdf8;font-size:12px;font-weight:700;border-radius:20px;margin-bottom:12px;border:1px solid rgba(56,189,248,0.3);">☁️ Audit AWS Gratuit</div>
          <h3 style="font-size:20px;font-weight:800;margin-bottom:8px;">Réduisez votre facture Cloud AWS de 30% à 60%</h3>
          <p style="font-size:13px;color:#94a3b8;line-height:1.5;margin-bottom:16px;">
            Obtenez immédiatement le <strong>Check-list d'Économie Cloud 2026</strong> pour détecter vos ressources inutilisées (EBS orphelins, instances oversized, NAT Gateways).
          </p>
          <form id="winnow-exit-form">
            <input type="email" id="winnow-exit-email" required placeholder="Votre email professionnel..." style="width:100%;padding:12px;background:#0f172a;border:1px solid #334155;border-radius:8px;color:#fff;font-size:13px;margin-bottom:12px;box-sizing:border-box;" />
            <button type="submit" style="width:100%;padding:12px;background:linear-gradient(to right, #38bdf8, #818cf8);border:none;border-radius:8px;color:#090d16;font-weight:800;font-size:14px;cursor:pointer;">Débloquer mon Audit AWS Gratuit</button>
          </form>
        </div>
      </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHtml);

    document.getElementById('winnow-close-exit-modal').onclick = function () {
      document.getElementById('winnow-exit-modal').remove();
    };

    document.getElementById('winnow-exit-form').onsubmit = function (e) {
      e.preventDefault();
      var email = document.getElementById('winnow-exit-email').value;
      if (window.trackGrowthEvent) {
        window.trackGrowthEvent('exit_intent_lead_captured', { email: email });
      }
      document.getElementById('winnow-exit-modal').innerHTML = `
        <div style="background:#090d16;border:1px solid #38bdf8;border-radius:16px;max-width:400px;width:100%;padding:28px;color:#fff;text-align:center;">
          <div style="font-size:36px;margin-bottom:8px;">🚀</div>
          <h3 style="font-size:18px;font-weight:700;color:#38bdf8;">Guide envoyé avec succès !</h3>
          <p style="font-size:13px;color:#94a3b8;margin-top:8px;">Vérifiez votre boîte mail <strong>${email}</strong>.</p>
          <button onclick="document.getElementById('winnow-exit-modal').remove()" style="margin-top:16px;padding:8px 20px;background:#1e293b;border:none;border-radius:8px;color:#fff;cursor:pointer;">Fermer</button>
        </div>
      `;
    };
  }
})();
