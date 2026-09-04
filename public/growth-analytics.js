/**
 * Growth, Analytics & Retention Engine for Winnow (Datadog & Cloud FinOps)
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

  // 3. Exit-Intent Modal Injector (Datadog FinOps Focused)
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
      <div id="winnow-exit-modal" style="position:fixed;inset:0;background:rgba(0,0,0,0.8);z-index:9999;display:flex;align-items:center;justify-content:center;padding:20px;backdrop-filter:blur(6px);">
        <div style="background:#0F172A;border:1px solid #38BDF8;border-radius:18px;max-width:460px;width:100%;padding:28px;color:#F8FAFC;position:relative;box-shadow:0 25px 50px -12px rgba(0,0,0,0.7);font-family:sans-serif;">
          <button id="winnow-close-exit-modal" style="position:absolute;top:16px;right:16px;background:none;border:none;color:#94A3B8;font-size:22px;cursor:pointer;line-height:1;">✕</button>
          <div style="display:inline-block;padding:4px 12px;background:rgba(16,185,129,0.15);color:#34D399;font-size:12px;font-weight:700;border-radius:20px;margin-bottom:12px;border:1px solid rgba(16,185,129,0.3);">⚡ Guide FinOps Datadog 2026</div>
          <h3 style="font-size:20px;font-weight:800;margin-bottom:8px;color:#F8FAFC;line-height:1.3;">Réduisez votre facture Datadog de 20% à 40%</h3>
          <p style="font-size:13px;color:#94A3B8;line-height:1.5;margin-bottom:16px;">
            Téléchargez immédiatement notre <strong>Guide Pratique FinOps Datadog</strong> pour éliminer les métriques orphelines et filtrer les logs inutiles sans impacter vos alertes.
          </p>
          <form id="winnow-exit-form">
            <input type="email" id="winnow-exit-email" required placeholder="Votre email professionnel..." style="width:100%;padding:12px 14px;background:#080D1A;border:1px solid #334155;border-radius:8px;color:#F8FAFC;font-size:13px;margin-bottom:12px;box-sizing:border-box;outline:none;" />
            <button type="submit" style="width:100%;padding:12px;background:linear-gradient(135deg, #10B981, #059669);border:none;border-radius:8px;color:#FFFFFF;font-weight:800;font-size:14px;cursor:pointer;">Recevoir le Guide Datadog Gratuit</button>
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
        <div style="background:#0F172A;border:1px solid #10B981;border-radius:18px;max-width:420px;width:100%;padding:32px 24px;color:#F8FAFC;text-align:center;font-family:sans-serif;">
          <div style="font-size:36px;margin-bottom:8px;">🚀</div>
          <h3 style="font-size:19px;font-weight:800;color:#34D399;">Guide envoyé avec succès !</h3>
          <p style="font-size:13px;color:#94A3B8;margin-top:8px;line-height:1.5;">Vérifiez votre boîte mail <strong>${email}</strong>.</p>
          <button onclick="document.getElementById('winnow-exit-modal').remove()" style="margin-top:18px;padding:10px 24px;background:#1E293B;border:1px solid #334155;border-radius:8px;color:#F8FAFC;cursor:pointer;font-weight:700;">Fermer</button>
        </div>
      `;
    };
  }
})();
