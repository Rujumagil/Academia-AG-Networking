(() => {
  'use strict';

  const RELEASE = '20260828.94';
  let timer = null;

  function injectStyles() {
    if (document.querySelector('#ag-certificate-screen-v94-style')) return;
    const style = document.createElement('style');
    style.id = 'ag-certificate-screen-v94-style';
    style.textContent = `
      html.ag-cert-view-v94 #ag-admin-request-inbox-v86,
      html.ag-cert-view-v94 .ag-agent-launcher,
      html.ag-cert-view-v94 .ag-agent-panel:not(.is-open){display:none!important}

      html.ag-cert-view-v94 .certificate-document-wrap{
        width:100%!important;
        max-width:1080px!important;
        margin:0 auto!important;
        padding:18px!important;
        overflow:visible!important;
        box-sizing:border-box!important;
        border-radius:24px!important;
        background:linear-gradient(145deg,#eef2f4,#e7edf0)!important;
      }

      html.ag-cert-view-v94 .certificate-document.ag-cert-v91{
        width:100%!important;
        max-width:1040px!important;
        height:auto!important;
        min-height:0!important;
        aspect-ratio:11/8.5!important;
        margin:0 auto!important;
        transform:none!important;
        transform-origin:center!important;
        box-sizing:border-box!important;
        overflow:hidden!important;
        box-shadow:0 18px 42px rgba(6,27,53,.14)!important;
      }

      html.ag-cert-view-v94 .ag-cert-v91__content{
        max-width:75%!important;
        margin:8.5% auto 0 1.5%!important;
      }
      html.ag-cert-view-v94 .ag-cert-v91__subtitle{margin:1.25% auto 3.25%!important}
      html.ag-cert-view-v94 .ag-cert-v91__recipient-label{margin-bottom:1%!important}
      html.ag-cert-view-v94 .ag-cert-v91__name{padding-bottom:1%!important}
      html.ag-cert-view-v94 .ag-cert-v91__body{margin-top:2.7%!important;line-height:1.28!important}
      html.ag-cert-view-v94 .ag-cert-v91__ornament{margin:1.8% auto!important}
      html.ag-cert-view-v94 .ag-cert-v91__notice{
        max-width:72%!important;
        line-height:1.35!important;
      }
      html.ag-cert-view-v94 .ag-cert-v91__meta{
        margin-top:1.7%!important;
        gap:9%!important;
      }

      html.ag-cert-view-v94 .ag-cert-v91__signatures{
        left:17%!important;
        right:24%!important;
        bottom:12.8%!important;
        gap:14%!important;
        z-index:8!important;
      }
      html.ag-cert-view-v94 .ag-cert-v91__signature-name{
        padding-bottom:1%!important;
      }
      html.ag-cert-view-v94 .ag-cert-v91__signature-role{
        margin-top:1.3%!important;
      }

      html.ag-cert-view-v94 .ag-cert-v91__qr{
        right:5.2%!important;
        bottom:12.2%!important;
        width:9.2%!important;
        z-index:9!important;
      }
      html.ag-cert-view-v94 .ag-cert-v91__qr-label{
        right:4.8%!important;
        bottom:9.6%!important;
        width:10%!important;
        z-index:9!important;
      }

      html.ag-cert-view-v94 .ag-cert-v91__wave{
        left:-4%!important;
        right:-4%!important;
        bottom:-2.5%!important;
        height:10.5%!important;
        border-radius:50% 50% 0 0/50% 50% 0 0!important;
        transform:rotate(-.7deg)!important;
        z-index:0!important;
      }
      html.ag-cert-view-v94 .ag-cert-v91__wave:before{
        top:-13%!important;
        height:12%!important;
        border-top-width:9px!important;
      }
      html.ag-cert-view-v94 .ag-cert-v91__wave:after{
        top:-27%!important;
        height:12%!important;
        border-top-width:5px!important;
      }

      html.ag-cert-view-v94 .certificate-view-heading{
        max-width:1080px!important;
        margin-left:auto!important;
        margin-right:auto!important;
        align-items:center!important;
        gap:14px!important;
      }
      html.ag-cert-view-v94 .certificate-actions{
        display:flex!important;
        gap:8px!important;
        flex-wrap:wrap!important;
      }
      html.ag-cert-view-v94 .certificate-actions .btn{
        min-height:42px!important;
        border-radius:12px!important;
      }

      @media(max-width:900px){
        html.ag-cert-view-v94 .certificate-document-wrap{
          padding:10px!important;
          border-radius:18px!important;
        }
        html.ag-cert-view-v94 .certificate-document.ag-cert-v91{
          max-width:100%!important;
        }
      }

      @media(max-width:760px){
        html.ag-cert-view-v94 .page-content,
        html.ag-cert-view-v94 .main-content{overflow-x:hidden!important}
        html.ag-cert-view-v94 .certificate-document-wrap{
          padding:5px!important;
          overflow:hidden!important;
          border-radius:12px!important;
        }
        html.ag-cert-view-v94 .certificate-document.ag-cert-v91{
          width:100%!important;
          max-width:100%!important;
          box-shadow:0 8px 22px rgba(6,27,53,.13)!important;
        }
        html.ag-cert-view-v94 .ag-cert-v91__content{
          max-width:75%!important;
          margin-top:8.2%!important;
        }
        html.ag-cert-view-v94 .ag-cert-v91__signatures{
          left:16%!important;
          right:23%!important;
          bottom:13%!important;
          gap:11%!important;
        }
        html.ag-cert-view-v94 .ag-cert-v91__qr{
          right:4.7%!important;
          bottom:12.7%!important;
          width:9.5%!important;
        }
        html.ag-cert-view-v94 .ag-cert-v91__qr-label{
          right:4.3%!important;
          bottom:10%!important;
          width:10.5%!important;
        }
        html.ag-cert-view-v94 .ag-cert-v91__wave{
          bottom:-2%!important;
          height:10%!important;
        }
        html.ag-cert-view-v94 .certificate-view-heading{
          display:grid!important;
          grid-template-columns:1fr!important;
        }
        html.ag-cert-view-v94 .certificate-actions{
          width:100%!important;
          display:grid!important;
          grid-template-columns:1fr 1fr!important;
        }
        html.ag-cert-view-v94 .certificate-actions .btn{
          width:100%!important;
          min-width:0!important;
          padding-inline:9px!important;
          font-size:.74rem!important;
        }
      }

      @media(max-width:500px){
        html.ag-cert-view-v94 .certificate-document-wrap{padding:3px!important}
        html.ag-cert-view-v94 .ag-cert-v91__content{margin-top:7.8%!important}
        html.ag-cert-view-v94 .certificate-actions{grid-template-columns:1fr!important}
      }
    `;
    document.head.appendChild(style);
  }

  function sync() {
    injectStyles();
    const visible = Boolean(document.querySelector('#certificate-document.ag-cert-v91, #certificate-document'));
    document.documentElement.classList.toggle('ag-cert-view-v94', visible);
    if (visible) {
      const cert = document.querySelector('#certificate-document');
      if (cert) cert.dataset.agCertScreen = RELEASE;
    }
    document.documentElement.dataset.agCertificateScreenRelease = RELEASE;
  }

  function schedule() {
    clearTimeout(timer);
    timer = setTimeout(sync, 40);
  }

  const observer = new MutationObserver(schedule);
  observer.observe(document.documentElement, { childList:true, subtree:true, attributes:true, attributeFilter:['class'] });
  window.addEventListener('hashchange', schedule);
  window.addEventListener('resize', schedule);
  window.addEventListener('pageshow', schedule);

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', sync, { once:true });
  else sync();

  window.ACADEMIA_AG_CERTIFICATE_SCREEN_V94 = { release: RELEASE, refresh: sync };
})();
