(() => {
  'use strict';
  const RELEASE='20260819.1';
  const COURSE_ID='11111111-1111-4111-8111-111111111111';
  const WELCOME_MODULE='11111111-0000-4111-8111-000000000001';
  const WELCOME_LESSON='22222222-0001-4222-8222-222222222222';
  const WELCOME_ID='1IyV7cNzBq1TExmTIMU78z4_gOe_t8Kr6';
  const MODULES={
    '11111111-aaaa-4111-8111-111111111111': '1pnox8J5lAe67EJ_95WOrHKjMvWU7KIDu,1FFUDZ729QjyZIAkaawopvg6xFU5qxb4X,14uZFj-v2CFKYllbIRWRMRZPQZpFDVtJz,1dUwNPXTEJuLhn-RJJlifrFpr78m7Wlyx,1sseyL9d8HfuZQrdvTP6xX5ep3NVMi_E8,10Z1FYZM7Ggq82oPfVVLa-7pF4UKIh2rD,1IsnzWBAImv1uVNcWZVpkT98kJw82ybSO,17GnRmX5wMYIUFkCQnreMeoTblNp-NPRs,1Kn09_v4LC-pxjB39jD6TnNh6-yLuYNcq,1dzuB_xfYllx5XJG-BBVHKVgcby6f2soo,1LThKS4je67icm2cLeUYPbKmVtfyuUAu-,1-HHxZezwlXjFD_RAt0wWUtwIDT4utNtW,1YRSVR6savVazLKHVxsW4-TEpfI7VF7zn'.split(','),
    '11111111-bbbb-4111-8111-111111111111': '1oy_53pUyAWUtY2sjEjA9NeDXC2faMTfC,1GPwH5C6GTr2EwWS9LeSubiHvn99xhcrF,1MA0U9IqIdahWeKDijiHGTNlTp3MhG3Rv,1N-t9boCApti4CZEpEUDrKTDHzNSVGwSm,1-G4Y8vVbWYpci1qG0HUnDL3foEgIj8P0,1OTP9uiqC22_fOUv0LM9844Shi_amsiiB,16PTyUpvv7I8IkTgvohR1ZdEwQGuOnx0y,14zTI22cdaGodeZVUjxr6NgcWvNkpQsJL,1Y9tU_FsuIsBhx3UBdiaCf-HPY7UKtWag,1Dqb3RMiL04OHsSmluZFi8-tt75FgsAkV,1UNnd87D4dho3uIWTOiyBW9mXFo-Rx1GD,12ABU-JGIwu0Mi2aCL-k1ATzOQR3y3khL,11urgz07qUyR09C3XzwrM03Vf-0OHUMTr,1T8XN5J4VlRIu9ebhu_95_fn0tv-ztcJW,1XI3DAXNqNS9Mp32IfJLXvj9kFqJezza8,1XrRj2dCtMpq_fwkYk1O-fEaqARsVIHws,15Mn4te3P08iNqWo9u6k2DowynGbr_ojD,1IRhmxFObPIzu1-Gljz6ELqYVOagL7NZo'.split(','),
    '11111111-cccc-4111-8111-111111111111': '1oC9IpYRAt5qqn3nI_ohAX61xo9vUYvKZ,1B24rYJxbd_IluzAjfLHzzc6excVECxxP,1yaEFAUuUoAdlhkkgXx7OGLDeEfAUGA5x,1Oup9HweAzK3aMWYSTT6mjHnpYbvb7y4a,1Rt0HYOe1HIT_uhqeSA7B0_i52vWTKsvL,1vYRyw5APEf0v4vEq-sMzhCg4d7fpUbaF,1UHJ9zKF5FTt7YBY67LP8jlHAy4TBTVhY,1CCGx_PYtTj5_WcTrVrOVaBPn1-t3kC13,1qbNADu74w4wmHf6kFM3rCt5mhCY4gzQ6,1rzzuP5BBk5dh-KnvvPptdwHDPjRFOVaV,1Fdo3ZP_5JHeRTHgNuj7DPiofYq49_trP,1_nHzHvWSvwhCXssv5tltHQDIuKlBLkjC,1YFZiln5xhmb3G9lEdQx_3-C-64w-U4wW,1viPJue4ij4mB7fLZnFsXyczYZVKrqDft,1OMVMgn1OaD8Op8sA0wSLzun41GJ_gkt2,18rNlSovpYrGnT3ovPjcSwzI6wq5xvSG8,1bJEGK9zZeiL5OngULYWmR-Lhmaf3T0du,1q3qfX3GDTXQEK_SBPAcg56fDiMxZ2ppW,1Jybgw2zfSgjVjjHVZsGQUMCvuKr3zy0i,1qGtmTcyBpp-NJHkSEoriTvuVSC9W0-nA'.split(','),
    '11111111-dddd-4111-8111-111111111111': '1UGaY0pnl4oxpkqLEchH2q15L8R9l24u6,1foOrYtV-gL8E4hPoiPGVxHwf94FC5jYt,1VwCSFf7q0ZjoqAwjlsSQ9LPY1emR2F2g,1u1sYqmfkvQcqAX5a-7-jvIIfSQpnMPpH,1a-ajuCt0dzGYsOHnLFU2pKdNd_jQRl8V,1InVFRIa0JZEWHgX5VWuTBmR7-qgRO-EW,1vj0Sf3YqkCtfCh60kSmJaIHMrOa6oVEl,1J3xirK9GWkYjbQmr1_lSbyoaGJESAY2c,1C0B87MOhr1EmNtt1mctUCQgmu-wYhZMY,10ooM66MCGpmwBfOtI22UzNHPZHbVyslV,1u4rroAFK-3Kdtnbdbbx8W_QJq7R412se,1vcVuuWZ9juSDjG_m1jQs-Bd_mPUhMmkg,1q580NhWBoeCUaWv67C7qc6eQcVhV-Zin,1dPC7pTYYzH9Owzp_TeQqZiCbUxe4aN50,1JFuavRNM3XH2XIxaXoRIk2lxvI5OaGGL,1OezNGJxOv-qqEVzq2yONfeVI-s4Wgjua,1D-lmvbzHG1-z_EvKMS5HOZZ52kTAbrtY,1ggLPvLDlzcLJYC28Anjk7UUkma-0jQoe,1XumGlVrK9ioupSRTVhYAh91uoL_SpOGK,1PxP-ynAL_6rFa6ofTcz5xSo0sPcwBk_k,1f_krhX23uJO5jQ_8-qR2OR65ysfz8Cb1'.split(','),
    '11111111-eeee-4111-8111-111111111111': '1CQ21x29PRn0djt4DPtCI94hOvKPT5r6t,1Nc8P9avPEx8O8-m5R0LEDMzlxD8ci3gH,1TBMWJXZ-X1kmnflggo1O92GV2ehq3IUd,1NS_ElunYwqGyMnXYvTJuDxefSfhU5qsc,1MbthxQpRAOS87-Dym2cOXbkLcwnmAjBk,1tGyA87MyHXKLaHHORlU-dh98LetufoK6,1PnxiKIzdIOY7Ap5Ru-aNi_sGttreyIPl,1QGHTb86OlrsQCtsB0JBVBaPfsatBA72u,10HOJqNBEx4gY2DNtXlFEMXGZTrK9mXmb,15aMP7f4VCkbPAz2ivFmux_HwL5Z2iYaR,19YLCYuSU5dneEU8kkOe58yyJN6DhkWvt,1cA6PDMsGIXNe8foM3rsYQwug9qQxL8lW,1Io71pUFS3JulO_-DjJNe3CSzdi_4jhw9,10IsNZh77U_p2AWYlasrJ10PdNQScIycy,1AhwHeBCq6cX52a2alyY3i1MFoefMR4-s,1PAnn_LCdeaA5s1F2z4uiNk4HreyX1qPG,1SIzVukxD162_qyOPp7q-iET46ajsyP4M,1ISgaVQk6PNDlejlKMFJEqi-bb131v-qs,1OQDRtlqNpKReBGd6G42cuA4cRRcsfHI7,1U_SYS3UppMssbx0hJtc-5lJrP_IVE5uW'.split(','),
    '11111111-ffff-4111-8111-111111111111': '1COp7JQWnPwkwNvEpcv4cNqZnHisI35TD,1xdsumLtB3FzYF1HXQ-xmtDZZ3k2Sb4Ic,1JmiUMG8WbuVi3RTIQ0EOXnwGCB28EHvr,1EifS6Y4I2oc6qWptgHJIDzi1GOfdl711,1grRNQMr015MIss5L8sktlTZj979TW9yq,1SO2LW9_dQhgB2dQbcEasQRdIiKNWmlza,1usc1iCvqAXR0A3_yratXoFjfhnlHK1Gk,1AFvNXARUGw7AzvOh4CgkWbPq3KcX8TE3,1eq-ITCO9TmvWsP9d1HfzNM_5plGirZZ-,1qR-IIdZGlssCDukbEcHH9cxGNlnWbOP6,1HgzUCZW4M5Gg8t0t3JuW6fajuiFvRjpU,16fcxuRUGpoVdQ-NVx3V6xnxSYAsGdSre,1Ta93RKc_orMyU7TZMOyh3NA-3yEh7KQl,1gC2DWY1_r-2PwEk7Vf0ejAyFP7Z9ts_m,19Un28liNDfgNGPxWUcO4C1WLnwr2nR_Q,1LMNIxtl3pjH0l69W1yLSxSefDRVhAmGe,1JensgVt-T0iTuH5KvDZODWp8LfulMicQ,1ZBJmHULjTL49R416R5BWibFhtJgg_nUg,1D_1xYVy5DAMjnrkstjz8whx87yoQXIGN,1ocghQRnF6G4A6DQH04rtXvPoJwz7IsVH,1oOciK5zNe_43BIHGSpqVqNJB6MqL5Nxi,1MzYHetDbVb6aHPn7Ngt5BuaLob73YTEx,1SbqgtpQK-0MKd6Is2Sa4X4tvncM_Arbk,1wIQgPLgURjivvMVhO6G6xNTioHCfSAHj,1sT1Ll9avuLVIeVtpjQB2qQbHkyWUz5C5'.split(',')
  };
  const EXTRAS=[
    {id:'drive-utah-clase-5-completa',title:'Clase 5 · Video completo',driveId:'1oGqd6afB0AtkS2X6OtCIirZygUP9SeDC'},
    {id:'drive-utah-clase-6-completa',title:'Clase 6 · Video completo',driveId:'1Tq_9EuStE9tbJ2FGkk9XSo6WiQNJdLjh'},
    {id:'drive-utah-clase-6-completa-v2',title:'Clase 6 · Video completo · versión 2',driveId:'1BE6Vi3KCVA04xTo1tIy2qHz0ljHwuNuE'}
  ];
  const preview=id=>`https://drive.google.com/file/d/${id}/preview`;
  const view=id=>`https://drive.google.com/file/d/${id}/view`;

  function course(){
    if(typeof state==='undefined'||!Array.isArray(state.courses)) return null;
    return state.courses.find(item=>item.id===COURSE_ID)||null;
  }

  function patchState(){
    const current=course();
    if(!current?.modules?.length) return 0;
    let changed=0;
    current.modules.forEach(module=>{
      if(module.id===WELCOME_MODULE){
        const lesson=(module.lessons||[]).find(item=>item.id===WELCOME_LESSON)||(module.lessons||[]).find(item=>Number(item.position)===1);
        if(lesson){
          const url=preview(WELCOME_ID);
          if(lesson.video_url!==url){lesson.video_url=url;changed++;}
        }
        return;
      }
      const files=MODULES[module.id];
      if(!files) return;
      (module.lessons||[]).forEach(lesson=>{
        const pos=Number(lesson.position);
        const id=Number.isInteger(pos)&&pos>0?files[pos-1]:null;
        if(!id) return;
        const url=preview(id);
        if(lesson.video_url!==url){lesson.video_url=url;changed++;}
      });
    });
    return changed;
  }

  function patchResources(){
    if(typeof state==='undefined'||!Array.isArray(state.resources)||!course()) return 0;
    let added=0;
    EXTRAS.forEach(item=>{
      if(state.resources.some(resource=>resource.id===item.id)) return;
      state.resources.push({
        id:item.id,course_id:COURSE_ID,title:item.title,
        description:'Versión completa de apoyo alojada en Google Drive.',
        resource_type:'video',external_url:view(item.driveId),
        thumbnail_url:'recurso-utah-driver.webp',is_public:false,source:'google-drive'
      });
      added++;
    });
    return added;
  }

  function activeLesson(){
    const parts=location.hash.replace(/^#/,'').split('/');
    if(parts[0]!=='lesson'||parts[1]!==COURSE_ID||!parts[2]) return null;
    const current=course();
    if(!current) return null;
    for(const module of current.modules||[]){
      const lesson=(module.lessons||[]).find(item=>item.id===parts[2]);
      if(lesson) return lesson;
    }
    return null;
  }

  function patchFrame(){
    const lesson=activeLesson();
    const target=lesson?.video_url||'';
    if(!/^https:\/\/drive\.google\.com\/file\/d\/[^/]+\/preview(?:$|\?)/i.test(target)) return;
    const shell=document.querySelector('.lesson-layout .video-shell');
    if(!shell) return;
    let frame=shell.querySelector('iframe.lesson-frame,iframe');
    if(!frame){
      const video=shell.querySelector('video.lesson-native-video,video');
      if(!video) return;
      frame=document.createElement('iframe');
      frame.className='lesson-frame';
      frame.title=lesson.title||'Video de la lección';
      video.replaceWith(frame);
      shell.classList.remove('native-video-active');
    }
    if(frame.getAttribute('src')!==target) frame.setAttribute('src',target);
    frame.setAttribute('allow','autoplay; fullscreen');
    frame.setAttribute('allowfullscreen','');
    frame.setAttribute('loading','lazy');
    frame.setAttribute('referrerpolicy','strict-origin-when-cross-origin');
  }

  function apply(){return {videos:patchState(),resources:patchResources(),frame:patchFrame()};}
  let timer;
  const schedule=()=>{clearTimeout(timer);timer=setTimeout(apply,30);};
  window.addEventListener('hashchange',schedule);
  window.addEventListener('pageshow',schedule);
  new MutationObserver(schedule).observe(document.querySelector('#app')||document.body,{childList:true,subtree:true});
  const interval=setInterval(apply,1000);
  setTimeout(()=>clearInterval(interval),30000);
  window.ACADEMIA_AG_DRIVE_VIDEOS={
    release:RELEASE,courseId:COURSE_ID,apply,preview,
    lessonVideos:Object.values(MODULES).reduce((sum,list)=>sum+list.length,0)+1,
    supplementalVideos:EXTRAS.map(item=>({...item,url:view(item.driveId)}))
  };
  schedule();
})();
