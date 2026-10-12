/**
 * OOGA BOOGA! - Theme Interactive Engine
 * Three.js 3D Book Viewer, Parallax Engine, Video Player, Carousel & Cart Drawer
 */

(function () {
  'use strict';

  // 1. STATE & CART MANAGEMENT
  const state = {
    cart: [
      {
        id: 'book-hardcover',
        title: 'Ooga Booga! (Collector Hardcover)',
        price: 24.99,
        quantity: 1,
        image: 'assets/images/product/book_cover_spread.png'
      }
    ],
    selectedVariant: 'hardcover',
    variantPrices: {
      hardcover: 24.99,
      softcover: 16.99
    },
    soundEnabled: true,
    carouselIndex: 0
  };

  // Fun Cartoon Sound Effect using Web Audio API (No external sound file required!)
  function playCartoonPop(freq = 440, type = 'sine') {
    if (!state.soundEnabled) return;
    try {
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(freq * 1.8, audioCtx.currentTime + 0.12);
      gain.gain.setValueAtTime(0.2, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.15);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.15);
    } catch (e) {
      // Audio not supported or blocked
    }
  }

  // 2. MULTI-PLANE PARALLAX SCROLLING ENGINE (Inspired by Stepout Dribbble Reference)
  function initParallax() {
    const s1 = document.getElementById('cinema-hero');
    const s2 = document.getElementById('enchanted-forest');
    const s3 = document.getElementById('village-shopfront');

    const s1Layers = [
      { el: document.getElementById('l-bg'),         speed: 0.24, isFrame: false },
      { el: document.getElementById('l-frame'),      speed: 0.14, isFrame: true  },
      { el: document.getElementById('l-palms'),      speed: 0.06, isFrame: false },
      { el: document.getElementById('l-stones'),     speed: 0,    isFrame: false },
      { el: document.getElementById('l-projector'),  speed: 0,    isFrame: false },
      { el: document.getElementById('l-character'),  speed: 0,    isFrame: false },
    ];
    const s1Centered = ['l-stones', 'l-character'];

    const s2LBg    = document.getElementById('s2-l-bg');
    const s2LTrees = document.getElementById('s2-l-trees');
    const s2LChars = document.getElementById('s2-l-chars');
    const s2LCat   = document.getElementById('s2-l-cat');

    const s3Fg = document.getElementById('s3LayerFg');

    let ticking = false;

    function updateLayerTransform(el) {
      if (!el) return;
      const mx = el._mouseX || 0;
      const my = el._mouseY || 0;
      const sy = el._scrollY || 0;
      const sc = el._scale !== undefined ? el._scale : 1;
      const isCentered = s1Centered.includes(el.id);

      // Dedicated 3D pivot physics for Section 2 Ladder:
      // Bottom foot (28% 90%) stays 100% pinned in river water, top monkey side falls backwards & down
      if (el === s2LCat) {
        const baseRotX = el._rotX || 0;
        const baseRotZ = el._rotZ || 0;
        const rotX = baseRotX - (my * 0.3);
        const rotY = mx * 0.4;
        const rotZ = baseRotZ;
        if (rotX === 0 && rotY === 0 && rotZ === 0) {
          el.style.transform = 'none';
        } else {
          el.style.transform = `perspective(1000px) rotateX(${rotX.toFixed(2)}deg) rotateY(${rotY.toFixed(2)}deg) rotateZ(${rotZ.toFixed(2)}deg)`;
        }
        return;
      }

      if (isCentered) {
        if (mx === 0 && my === 0 && sy === 0 && sc === 1) {
          el.style.transform = 'translateX(-50%)';
        } else {
          el.style.transform = `translateX(calc(-50% + ${mx}px)) translateY(${my + sy}px) scale(${sc})`;
        }
      } else {
        if (mx === 0 && my === 0 && sy === 0 && sc === 1) {
          el.style.transform = 'none';
        } else {
          el.style.transform = `translate3d(${mx}px, ${my + sy}px, 0) scale(${sc})`;
        }
      }
    }

    function applyLayer(el, sy, scale = 1) {
      if (!el) return;
      el._scrollY = sy;
      el._scale = scale;
      updateLayerTransform(el);
    }

    function onScroll() {
      if (!ticking) {
        requestAnimationFrame(() => {
          updateParallax();
          ticking = false;
        });
        ticking = true;
      }
    }

    function updateParallax() {
      const vh = window.innerHeight;

      // Section 1 Parallax (Outdoor Jungle Cinema - 2x Immersive 3D Depth & Walk-In Dolly)
      if (s1) {
        s1.style.marginBottom = '0px';
        const rect1 = s1.getBoundingClientRect();
        if (rect1.bottom > 0 && rect1.top < vh) {
          const sy = Math.max(0, -rect1.top);
          s1Layers.forEach(({ el, speed, isFrame }) => {
            if (!el) return;
            const ty = sy * speed;
            const sc = isFrame ? (1 + Math.min(0.04, sy * 0.000075)) : 1;
            applyLayer(el, ty, sc);
          });
        }
      }

      // Section 2 Parallax (Enchanted Pink Forest - Multi-Plane Parallax System on all 4 Layers)
      if (s2) {
        const rect2 = s2.getBoundingClientRect();
        if (rect2.bottom > 0 && rect2.top < vh) {
          const s2Center = (rect2.top + rect2.height / 2) - (vh / 2);
          const normalized = s2Center / (vh / 2);
          // Layers animate smoothly on scroll with progressive depth:
          applyLayer(s2LBg, normalized * -10);    // Layer 1: Sky & deep forest backdrop (slowest)
          applyLayer(s2LTrees, normalized * -6);   // Layer 2: Main pink trees (midground)
          // Layer 3: Characters dynamically move UPWARDS from exact position when scrolling
          const charsScrollY = normalized > 0 ? (normalized * 12) : (normalized * 42);
          applyLayer(s2LChars, charsScrollY);

          // Layer 4 (s2LCat): Ladder bottom stays fixed in river, top monkey side falls backwards & down!
          // Normalized decreases as user scrolls down: 1 (entering) -> 0 (center) -> -1 (exiting)
          const fallProgress = Math.max(0, Math.min(1.4, (1.0 - normalized) / 1.5));
          s2LCat._rotX = fallProgress * -15; // Tilts backwards into depth by up to -21deg
          s2LCat._rotZ = fallProgress * 5;   // Top tilts downwards and to the side by up to 7deg
          updateLayerTransform(s2LCat);
        }
      }
    }

    window.addEventListener('scroll', onScroll, { passive: true });
    updateParallax();

    // Desktop Mouse Move Dynamic 3D Depth (Cinema & Forest)
    if (window.innerWidth > 992) {
      function attachMouseParallax(section, layers) {
        if (!section) return;
        section.addEventListener('mousemove', function (e) {
          const rect = section.getBoundingClientRect();
          const relX = (e.clientX - rect.left) / rect.width - 0.5;
          const relY = (e.clientY - rect.top) / rect.height - 0.5;

          layers.forEach(function (layer) {
            if (layer.el) {
              layer.el._mouseX = relX * layer.xFactor;
              layer.el._mouseY = relY * layer.yFactor;
              updateLayerTransform(layer.el);
            }
          });
        });

        section.addEventListener('mouseleave', function () {
          layers.forEach(function (layer) {
            if (layer.el) {
              layer.el._mouseX = 0;
              layer.el._mouseY = 0;
              updateLayerTransform(layer.el);
            }
          });
        });
      }

      // Section 1: Dynamic 3D Cinema Experience (Audience, palms, screen & deep sky)
      attachMouseParallax(s1, [
        { el: document.getElementById('l-bg'),        xFactor: -14, yFactor: -8 },
        { el: document.getElementById('l-frame'),     xFactor: -8,  yFactor: -5 },
        { el: document.getElementById('l-palms'),     xFactor: -18, yFactor: -10 },
        { el: document.getElementById('l-stones'),    xFactor: -8,  yFactor: -5 },
        { el: document.getElementById('l-character'), xFactor: 12,  yFactor: 8  }
        // l-projector stays locked at seam
      ]);

      // Section 2: Enchanted Forest Multi-Plane Depth
      attachMouseParallax(s2, [
        { el: s2LBg,    xFactor: -10, yFactor: -6 },
        { el: s2LTrees, xFactor: -10, yFactor: -6 },
        { el: s2LChars, xFactor: -6,  yFactor: -4 },
        { el: s2LCat,   xFactor: 12,  yFactor: 8  }
      ]);
    }
  }

  // 2b. GSAP + SCROLLTRIGGER CINEMATIC 8-LAYER PARALLAX ENGINE FOR SECTION 3
  function initSection3Parallax() {
    const s3 = document.getElementById('village-shopfront');
    if (!s3) return;

    const l1 = document.getElementById('s3-l1-walls');
    const l2 = document.getElementById('s3-l2-trim');
    const l3 = document.getElementById('s3-l3-windows');
    const l4 = document.getElementById('s3-l4-pillars');
    const l5 = document.getElementById('s3-l5-fixtures');
    const l6 = document.getElementById('s3-l6-lanterns');
    const l7 = document.getElementById('s3-l7-ground');
    const l8 = document.getElementById('s3-l8-characters');
    const winContainer = s3.querySelector('.s3-windows-container');

    // Depth configuration according to Master Prompt specifications:
    const layers = [
      { el: l1, speed: 0.05, mouseX: -8  },
      { el: l2, speed: 0.10, mouseX: -12 },
      { el: l3, speed: 0.25, mouseX: 14  },
      { el: winContainer, speed: 0.25, mouseX: 14 },
      { el: l4, speed: 0.35, mouseX: 20  },
      { el: l5, speed: 0.40, mouseX: 24  },
      { el: l6, speed: 0.45, mouseX: 28  },
      { el: l7, speed: 0.70, mouseX: 36  },
      { el: l8, speed: 0.85, mouseX: 44  },
    ];

    // Responsive travel displacement: scales down on mobile/tablet to eliminate overflow
    const getMaxDelta = () => Math.min(window.innerWidth * 0.08, 90);

    // 1. GSAP ScrollTrigger Integration
    if (typeof gsap !== 'undefined' && typeof ScrollTrigger !== 'undefined') {
      gsap.registerPlugin(ScrollTrigger);

      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: s3,
          start: 'top bottom',
          end: 'bottom top',
          scrub: 0.6,
          invalidateOnRefresh: true,
          onToggle: (self) => {
            // will-change optimization: active only while Section 3 is in viewport
            const val = self.isActive ? 'transform' : 'auto';
            layers.forEach(({ el }) => {
              if (el) el.style.willChange = val;
            });
          }
        }
      });

      // Bind scrubbed translates to timeline:
      // At scroll progress = 0.5 (center of viewport), all layers are exactly at y = 0 (native PSD coords).
      // Entering from bottom: y = +speed * maxDelta; exiting through top: y = -speed * maxDelta.
      layers.forEach(({ el, speed }) => {
        if (!el) return;
        tl.fromTo(
          el,
          {
            y: () => speed * getMaxDelta(),
            force3D: true
          },
          {
            y: () => -speed * getMaxDelta(),
            ease: 'none',
            force3D: true
          },
          0
        );
      });
    } else {
      // Robust Fallback if GSAP is unavailable
      let ticking = false;
      function updateS3Fallback() {
        const rect = s3.getBoundingClientRect();
        const vh = window.innerHeight;
        if (rect.bottom > 0 && rect.top < vh) {
          const s3Center = (rect.top + rect.height / 2) - (vh / 2);
          const normalized = s3Center / (vh / 2);
          const maxDelta = getMaxDelta();
          layers.forEach(({ el, speed }) => {
            if (!el) return;
            const sy = normalized * speed * maxDelta;
            el.style.transform = `translate3d(0, ${sy}px, 0)`;
          });
        }
      }
      window.addEventListener('scroll', () => {
        if (!ticking) {
          requestAnimationFrame(() => {
            updateS3Fallback();
            ticking = false;
          });
          ticking = true;
        }
      }, { passive: true });
      updateS3Fallback();
    }

    // 2. Desktop Mouse Parallax (Dynamic 3D Depth on Cursor Move)
    if (window.innerWidth > 992) {
      s3.addEventListener('mousemove', function (e) {
        const rect = s3.getBoundingClientRect();
        const relX = (e.clientX - rect.left) / rect.width - 0.5;

        layers.forEach(({ el, mouseX }) => {
          if (!el) return;
          if (typeof gsap !== 'undefined') {
            gsap.to(el, {
              x: relX * mouseX,
              duration: 0.8,
              ease: 'power2.out',
              overwrite: 'auto'
            });
          } else {
            const currentY = el._scrollY || 0;
            el.style.transform = `translate3d(${relX * mouseX}px, ${currentY}px, 0)`;
          }
        });
      });

      s3.addEventListener('mouseleave', function () {
        layers.forEach(({ el }) => {
          if (!el) return;
          if (typeof gsap !== 'undefined') {
            gsap.to(el, {
              x: 0,
              duration: 0.8,
              ease: 'power2.out',
              overwrite: 'auto'
            });
          }
        });
      });
    }
  }

  // 3. THREE.JS 3D BOOK VIEWER (PRIMARY PRODUCT)
  function initThreeJsBookViewer(containerId, glbPath) {
    const container = document.getElementById(containerId);
    if (!container) return;

    // Check if Three.js is loaded
    if (typeof THREE === 'undefined') {
      console.warn('Three.js is loading asynchronously...');
      setTimeout(() => initThreeJsBookViewer(containerId, glbPath), 200);
      return;
    }

    const width = container.clientWidth || 500;
    const height = container.clientHeight || 500;

    const scene = new THREE.Scene();

    // Camera pointed straight at (0, 0, 0) so model is vertically and horizontally centered
    const camera = new THREE.PerspectiveCamera(38, width / height, 0.1, 100);
    camera.position.set(0, 0, 2.61);
    camera.lookAt(0, 0, 0);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 0.98; // Natural, accurate exposure (eliminates oversaturation/blowout)
    container.appendChild(renderer.domElement);

    // Balanced Natural Lighting (soft, rich, authentic colors without harsh oversaturation)
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.85);
    scene.add(ambientLight);

    const mainKeyLight = new THREE.DirectionalLight(0xfffbf2, 1.25);
    mainKeyLight.position.set(3, 4, 3);
    mainKeyLight.castShadow = true;
    scene.add(mainKeyLight);

    const rimLight = new THREE.DirectionalLight(0xe0f2fe, 0.45); // Subtle soft cool rim
    rimLight.position.set(-3, -2, -2);
    scene.add(rimLight);

    const softFillLight = new THREE.DirectionalLight(0xfff4ed, 0.40); // Soft warm bounce fill
    softFillLight.position.set(0, -2, 2);
    scene.add(softFillLight);

    // Soft Shadow Plane Underneath (placed right at base of standing book)
    const shadowGeo = new THREE.PlaneGeometry(3.15, 3.15);
    const shadowMat = new THREE.ShadowMaterial({ opacity: 0.30 });
    const shadowPlane = new THREE.Mesh(shadowGeo, shadowMat);
    shadowPlane.rotation.x = -Math.PI / 2;
    shadowPlane.position.y = -0.78;
    shadowPlane.receiveShadow = true;
    scene.add(shadowPlane);

    // MASTER PIVOT GROUP: Located at (0, 0, 0)
    // Rotates around the exact center of the container div without any wobble or offset
    const pivotGroup = new THREE.Group();
    pivotGroup.position.set(0, 0, 0);
    scene.add(pivotGroup);

    let bookModel = null;
    let uprightGroup = null;
    let autoRotate = true;
    let isDragging = false;
    let isTweening = false;
    let targetRotation = { x: 0, y: Math.PI, z: 0 };
    let prevMouseX = 0;
    let prevMouseY = 0;

    const modelUrl = container.dataset.modelUrl || glbPath || 'assets/models/Ooga_Booga_Hardcover_Render.glb';

    // Load actual GLB model
    const loader = new THREE.GLTFLoader();
    loader.load(
      modelUrl,
      function (gltf) {
        bookModel = gltf.scene;

        // Center vertices to origin inside an inner group
        const box = new THREE.Box3().setFromObject(bookModel);
        const center = box.getCenter(new THREE.Vector3());
        const size = box.getSize(new THREE.Vector3());
        const maxDim = Math.max(size.x, size.y, size.z);
        // Adjusted scale (-0.02): 1.48 / maxDim
        const scale = 1.48 / maxDim;

        bookModel.scale.set(scale, scale, scale);
        // Shift bookModel so its geometric bounding center is at (0, 0, 0)
        bookModel.position.set(-center.x * scale, -center.y * scale, -center.z * scale);

        // uprightGroup: rotates the model +90 deg around X so it stands UPRIGHT vertically ("khari")
        // and is not lying flat horizontally like the raw model.
        uprightGroup = new THREE.Group();
        uprightGroup.add(bookModel);
        uprightGroup.rotation.x = Math.PI / 2;

        pivotGroup.add(uprightGroup);

        // Initial Hero Pose: Standing upright, front cover facing user at slight dynamic 3D angle
        pivotGroup.rotation.set(THREE.MathUtils.degToRad(8), THREE.MathUtils.degToRad(-25), 0);
        targetRotation = { x: THREE.MathUtils.degToRad(8), y: THREE.MathUtils.degToRad(-25), z: 0 };

        bookModel.traverse(function (child) {
          if (child.isMesh) {
            child.castShadow = true;
            child.receiveShadow = true;
            if (child.material) {
              child.material.roughness = 0.65; // Matte storybook paper/cloth texture
              child.material.metalness = 0.05; // Eliminates harsh metallic specular sheen
            }
          }
        });

        const hint = container.querySelector('.interaction-hint-badge');
        if (hint) {
          setTimeout(() => {
            hint.style.transition = 'opacity 0.6s ease';
            hint.style.opacity = '0.6';
          }, 3000);
        }
      },
      undefined,
      function (error) {
        console.error('Error loading book model:', error);
      }
    );

    // Mouse & Touch Drag Controls
    container.addEventListener('mousedown', function (e) {
      isDragging = true;
      autoRotate = false;
      isTweening = false;
      prevMouseX = e.clientX;
      prevMouseY = e.clientY;
    });

    window.addEventListener('mouseup', function () {
      if (isDragging) {
        isDragging = false;
        // Resume slow auto-rotate after 2.5 seconds idle
        setTimeout(() => { 
          if (!isDragging && !isTweening) autoRotate = true; 
        }, 2500);
      }
    });

    container.addEventListener('mousemove', function (e) {
      if (!isDragging || !pivotGroup) return;
      const deltaX = e.clientX - prevMouseX;
      const deltaY = e.clientY - prevMouseY;
      pivotGroup.rotation.y += deltaX * 0.012;
      // Allow subtle vertical tilt while keeping book standing upright
      pivotGroup.rotation.x = Math.max(-0.5, Math.min(0.5, pivotGroup.rotation.x + deltaY * 0.008));
      prevMouseX = e.clientX;
      prevMouseY = e.clientY;
    });

    // Touch Support for Mobile
    container.addEventListener('touchstart', function (e) {
      if (e.touches.length === 1) {
        isDragging = true;
        autoRotate = false;
        isTweening = false;
        prevMouseX = e.touches[0].clientX;
        prevMouseY = e.touches[0].clientY;
      }
    }, { passive: true });

    container.addEventListener('touchmove', function (e) {
      if (!isDragging || !pivotGroup || e.touches.length !== 1) return;
      const deltaX = e.touches[0].clientX - prevMouseX;
      const deltaY = e.touches[0].clientY - prevMouseY;
      pivotGroup.rotation.y += deltaX * 0.015;
      pivotGroup.rotation.x = Math.max(-0.5, Math.min(0.5, pivotGroup.rotation.x + deltaY * 0.01));
      prevMouseX = e.touches[0].clientX;
      prevMouseY = e.touches[0].clientY;
    }, { passive: true });

    container.addEventListener('touchend', function () {
      if (isDragging) {
        isDragging = false;
        setTimeout(() => { 
          if (!isDragging && !isTweening) autoRotate = true; 
        }, 2500);
      }
    });

    // Preset Angle Buttons
    const btnCover = document.getElementById('btn-view-cover');
    const btnSpine = document.getElementById('btn-view-spine');
    const btnBack = document.getElementById('btn-view-back');
    const btnReset = document.getElementById('btn-view-reset');

    function animateToRotation(x, y, z, resumeAuto = false) {
      if (!pivotGroup) return;
      autoRotate = false;
      isTweening = true;
      targetRotation = { x, y, z };
      
      // Normalize current rotation.y to be within [-PI, PI] relative to target for clean rotation
      let currentY = pivotGroup.rotation.y;
      while (currentY - y > Math.PI) currentY -= Math.PI * 2;
      while (currentY - y < -Math.PI) currentY += Math.PI * 2;
      pivotGroup.rotation.y = currentY;

      if (resumeAuto) {
        setTimeout(() => {
          autoRotate = true;
        }, 2200);
      }
    }

    if (btnCover) {
      btnCover.addEventListener('click', () => {
        playCartoonPop(520);
        // Front Cover: Standing upright vertically ("khari"), facing directly to camera
        animateToRotation(0, 0, 0);
      });
    }

    if (btnBack) {
      btnBack.addEventListener('click', () => {
        playCartoonPop(640);
        // Back Cover: Standing upright vertically ("khari"), back side facing directly to camera
        animateToRotation(0, Math.PI, 0);
      });
    }

    if (btnSpine) {
      btnSpine.addEventListener('click', () => {
        playCartoonPop(580);
        // Spine: Standing upright vertically ("khari"), spine text facing directly to camera
        animateToRotation(0, Math.PI / 2, 0);
      });
    }

    if (btnReset) {
      btnReset.addEventListener('click', () => {
        playCartoonPop(480);
        // Reset View: Standing upright at dynamic 3D angle + resume auto-rotation
        animateToRotation(THREE.MathUtils.degToRad(8), THREE.MathUtils.degToRad(-25), 0, true);
      });
    }

    // Animation Loop
    let clock = new THREE.Clock();
    function animate() {
      requestAnimationFrame(animate);
      const delta = clock.getDelta();

      if (pivotGroup) {
        if (isTweening) {
          pivotGroup.rotation.x += (targetRotation.x - pivotGroup.rotation.x) * 0.12;
          pivotGroup.rotation.y += (targetRotation.y - pivotGroup.rotation.y) * 0.12;
          pivotGroup.rotation.z += (targetRotation.z - pivotGroup.rotation.z) * 0.12;
          
          if (
            Math.abs(targetRotation.y - pivotGroup.rotation.y) < 0.005 &&
            Math.abs(targetRotation.x - pivotGroup.rotation.x) < 0.005
          ) {
            pivotGroup.rotation.set(targetRotation.x, targetRotation.y, targetRotation.z);
            isTweening = false;
          }
        } else if (autoRotate) {
          // Continuous 360 degree smooth rotation while standing upright in exact center
          pivotGroup.rotation.y += delta * 0.4;
        }

        // Subtle floating bobbing centered at Y = 0
        pivotGroup.position.y = Math.sin(clock.getElapsedTime() * 1.5) * 0.025;
      }

      renderer.render(scene, camera);
    }
    animate();

    // Resize Handler
    window.addEventListener('resize', function () {
      if (!container) return;
      const newW = container.clientWidth;
      const newH = container.clientHeight;
      camera.aspect = newW / newH;
      camera.updateProjectionMatrix();
      renderer.setSize(newW, newH);
    });
  }

  // 4. LEGACY VILLAGE TRACK CAROUSEL (IF PRESENT)
  function initLegacyTrackCarousel() {
    const track = document.getElementById('tshirtCarouselTrack');
    const prevBtn = document.getElementById('carouselPrevBtn');
    const nextBtn = document.getElementById('carouselNextBtn');
    if (!track) return;

    const cards = track.querySelectorAll('.tshirt-card');
    const totalCards = cards.length;
    // Exactly 2 visible at a time
    const maxIndex = Math.max(0, totalCards - 2);

    function updateCarousel() {
      const offsetPct = state.carouselIndex * 50; // Each shift advances by 1 card
      track.style.transform = `translateX(-${offsetPct}%)`;
    }

    if (prevBtn) {
      prevBtn.addEventListener('click', function () {
        playCartoonPop(480);
        state.carouselIndex = (state.carouselIndex > 0) ? state.carouselIndex - 1 : maxIndex;
        updateCarousel();
      });
    }

    if (nextBtn) {
      nextBtn.addEventListener('click', function () {
        playCartoonPop(540);
        state.carouselIndex = (state.carouselIndex < maxIndex) ? state.carouselIndex + 1 : 0;
        updateCarousel();
      });
    }
  }

  // 5. INTERACTIVE PLUSHIE BEHAVIOR
  function initPlushieInteraction() {
    const plushieZone = document.getElementById('plushieShopZone');
    const plushieModal = document.getElementById('plushieModal');
    if (!plushieZone || !plushieModal) return;

    plushieZone.addEventListener('click', function () {
      playCartoonPop(660);
      plushieModal.classList.add('active');
    });

    plushieZone.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        playCartoonPop(660);
        plushieModal.classList.add('active');
      }
    });

    const closeBtn = plushieModal.querySelector('.modal-close-icon');
    if (closeBtn) {
      closeBtn.addEventListener('click', function () {
        playCartoonPop(380);
        plushieModal.classList.remove('active');
      });
    }

    plushieModal.addEventListener('click', function (e) {
      if (e.target === plushieModal) {
        plushieModal.classList.remove('active');
      }
    });
  }

  // 6. VIDEO PLAYER CONTROLS
  function initVideoCinema() {
    const video = document.getElementById('cinemaVideo');
    const playBtn = document.getElementById('btnPlayVideo');
    const muteBtn = document.getElementById('btnMuteVideo');
    if (!video) return;

    // Mobile vs Desktop video source switch
    if (window.innerWidth < 768 && video.dataset.portraitSrc) {
      video.src = video.dataset.portraitSrc;
    }

    if (playBtn) {
      playBtn.addEventListener('click', function () {
        playCartoonPop(500);
        if (video.paused) {
          video.play();
          playBtn.innerHTML = '⏸ PAUSE';
        } else {
          video.pause();
          playBtn.innerHTML = '▶ PLAY';
        }
      });
    }

    if (muteBtn) {
      muteBtn.addEventListener('click', function () {
        playCartoonPop(550);
        video.muted = !video.muted;
        muteBtn.innerHTML = video.muted ? '🔇 UNMUTE' : '🔊 MUTE';
      });
    }
  }

  // 7. CART DRAWER & VARIANT LOGIC
  function initCartAndVariants() {
    const cartDrawer = document.getElementById('cartDrawer');
    const cartOverlay = document.getElementById('cartOverlay');
    const openCartBtn = document.getElementById('openCartBtn');
    const closeCartBtn = document.getElementById('closeCartBtn');
    const addToCartBtn = document.getElementById('btnAddToCart');

    // Variant cards
    const variantCards = document.querySelectorAll('.variant-card');
    const bookPriceDisplay = document.getElementById('bookPriceDisplay');

    variantCards.forEach(card => {
      card.addEventListener('click', function () {
        playCartoonPop(520);
        variantCards.forEach(c => c.classList.remove('selected'));
        this.classList.add('selected');
        const variant = this.dataset.variant;
        state.selectedVariant = variant;
        if (bookPriceDisplay) {
          bookPriceDisplay.textContent = `$${state.variantPrices[variant].toFixed(2)}`;
        }
      });
    });

    // Quantity Stepper
    const qtyInput = document.getElementById('productQtyInput');
    const qtyMinus = document.getElementById('qtyMinusBtn');
    const qtyPlus = document.getElementById('qtyPlusBtn');

    if (qtyMinus && qtyInput) {
      qtyMinus.addEventListener('click', () => {
        let val = parseInt(qtyInput.value) || 1;
        if (val > 1) {
          qtyInput.value = val - 1;
          playCartoonPop(400);
        }
      });
    }

    if (qtyPlus && qtyInput) {
      qtyPlus.addEventListener('click', () => {
        let val = parseInt(qtyInput.value) || 1;
        qtyInput.value = val + 1;
        playCartoonPop(600);
      });
    }

    // Open/Close Cart
    function openCart() {
      playCartoonPop(620);
      if (cartDrawer) cartDrawer.classList.add('active');
      if (cartOverlay) cartOverlay.classList.add('active');
    }

    function closeCart() {
      playCartoonPop(380);
      if (cartDrawer) cartDrawer.classList.remove('active');
      if (cartOverlay) cartOverlay.classList.remove('active');
    }

    if (openCartBtn) openCartBtn.addEventListener('click', openCart);
    if (closeCartBtn) closeCartBtn.addEventListener('click', closeCart);
    if (cartOverlay) cartOverlay.addEventListener('click', closeCart);

    // Add To Cart
    if (addToCartBtn) {
      addToCartBtn.addEventListener('click', function () {
        const qty = parseInt(qtyInput ? qtyInput.value : 1) || 1;
        const variantTitle = state.selectedVariant === 'hardcover' ? 'Hardcover (Collector Edition)' : 'Softcover (Classic Edition)';
        const variantPrice = state.variantPrices[state.selectedVariant];

        // Check if item already exists
        const existing = state.cart.find(i => i.id === state.selectedVariant);
        if (existing) {
          existing.quantity += qty;
        } else {
          state.cart.push({
            id: state.selectedVariant,
            title: `Ooga Booga! - ${variantTitle}`,
            price: variantPrice,
            quantity: qty,
            image: 'assets/images/product/book_cover_spread.png'
          });
        }

        renderCart();
        openCart();
      });
    }

    function renderCart() {
      const itemsContainer = document.getElementById('cartDrawerItems');
      const subtotalEl = document.getElementById('cartSubtotalAmount');
      const countEl = document.getElementById('cartCountBadge');
      if (!itemsContainer) return;

      itemsContainer.innerHTML = '';
      let subtotal = 0;
      let totalCount = 0;

      state.cart.forEach((item, idx) => {
        subtotal += item.price * item.quantity;
        totalCount += item.quantity;

        const card = document.createElement('div');
        card.className = 'cart-item-card';
        card.innerHTML = `
          <img src="${item.image}" alt="${item.title}" class="cart-item-img">
          <div class="cart-item-details">
            <div class="cart-item-title">${item.title}</div>
            <div class="cart-item-price">$${item.price.toFixed(2)}</div>
            <div class="cart-item-qty">Qty: ${item.quantity}</div>
          </div>
          <button type="button" class="cart-item-remove" data-index="${idx}" aria-label="Remove item">✕</button>
        `;
        itemsContainer.appendChild(card);
      });

      if (subtotalEl) subtotalEl.textContent = `$${subtotal.toFixed(2)}`;
      if (countEl) countEl.textContent = totalCount;

      // Attach remove handlers
      itemsContainer.querySelectorAll('.cart-item-remove').forEach(btn => {
        btn.addEventListener('click', function () {
          const idx = parseInt(this.dataset.index);
          state.cart.splice(idx, 1);
          renderCart();
        });
      });
    }

    renderCart();
  }

  // 8. NOTIFY MODAL LOGIC
  function initNotifyModal() {
    const notifyModal = document.getElementById('notifyModal');
    const notifyBtns = document.querySelectorAll('.btn-notify');
    if (!notifyModal) return;

    notifyBtns.forEach(btn => {
      btn.addEventListener('click', function (e) {
        e.stopPropagation();
        playCartoonPop(520);
        notifyModal.classList.add('active');
      });
      btn.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          playCartoonPop(520);
          notifyModal.classList.add('active');
        }
      });
    });

    const closeBtn = notifyModal.querySelector('.modal-close-icon');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => {
        playCartoonPop(380);
        notifyModal.classList.remove('active');
      });
    }

    notifyModal.addEventListener('click', (e) => {
      if (e.target === notifyModal) {
        notifyModal.classList.remove('active');
      }
    });

    const form = notifyModal.querySelector('form');
    if (form) {
      form.addEventListener('submit', function (e) {
        e.preventDefault();
        playCartoonPop(680);
        alert('🎉 You are on the VIP waitlist for Ooga Booga merchandise!');
        notifyModal.classList.remove('active');
      });
    }
  }

  // 9. SECTION 3 SHOPFRONT CAROUSEL (4 PRODUCTS WITH IN-PLACE FADE/POP)
  function initShopfrontCarousel() {
    const window1 = document.getElementById('s3Window1');
    const window2 = document.getElementById('s3Window2');
    const prevBtn = document.getElementById('s3ShopPrev');
    const nextBtn = document.getElementById('s3ShopNext');
    const notifyModal = document.getElementById('notifyModal');

    if (!window1 || !window2) return;

    const flipper1 = document.getElementById('s3Flipper1');
    const flipper2 = document.getElementById('s3Flipper2');
    const badge1 = document.getElementById('s3Badge1');
    const badge2 = document.getElementById('s3Badge2');
    const imgFront1 = document.getElementById('s3ImgFront1');
    const imgBack1 = document.getElementById('s3ImgBack1');
    const imgFront2 = document.getElementById('s3ImgFront2');
    const imgBack2 = document.getElementById('s3ImgBack2');

    // 4 Products data
    const products = [
      {
        id: 1,
        title: "Wild Ooga Classic Vintage Tee",
        price: "$28.00",
        badge: "COMING SOON",
        tag: "★ COMING SOON TO SUBURBIA ★",
        desc: "Our 3D tailored vintage t-shirts are currently in pre-production. Enter your email to get notified the second they go live!",
        frontImg: "assets/images/shop/tshirt_mockup_ooga.png",
        backImg: "assets/images/shop/tshirt_mockup_ooga_back.png"
      },
      {
        id: 2,
        title: "Suburbia Run Adventure Tee",
        price: "$28.00",
        badge: "COMING SOON",
        tag: "★ COMING SOON TO SUBURBIA ★",
        desc: "Join the neighborhood run with Gianna & friends in our premium heavyweight ring-spun cotton tee.",
        frontImg: "assets/images/shop/tshirt_mockup_boy.png",
        backImg: "assets/images/shop/tshirt_mockup_boy_back.png"
      },
      {
        id: 3,
        title: "Gianni's Creature Club Tee",
        price: "$32.00",
        badge: "LIMITED EDITION",
        tag: "★ EXCLUSIVE DROP ★",
        desc: "Official collector shirt featuring the secret magical club emblem from chapter 4 of Ooga Booga.",
        frontImg: "assets/images/shop/tshirt_mockup_ooga.png",
        backImg: "assets/images/shop/tshirt_mockup_ooga_back.png"
      },
      {
        id: 4,
        title: "Enchanted Suburbia Retro Tee",
        price: "$30.00",
        badge: "EXCLUSIVE DROP",
        tag: "★ SPECIAL PRE-ORDER ★",
        desc: "Ultra-soft retro washed tee celebrating the magical twilight woods and neighborhood adventures.",
        frontImg: "assets/images/shop/tshirt_mockup_boy.png",
        backImg: "assets/images/shop/tshirt_mockup_boy_back.png"
      }
    ];

    let currentIndex = 0;
    let isTransitioning = false;

    function openProductModal(prod) {
      if (!notifyModal || !prod) return;
      playCartoonPop(520);
      const modalTag = document.getElementById('notifyModalTag');
      const modalTitle = document.getElementById('notifyModalTitle');
      const modalPrice = document.getElementById('notifyModalPrice');
      const modalDesc = document.getElementById('notifyModalDesc');

      if (modalTag) modalTag.textContent = prod.tag;
      if (modalTitle) modalTitle.textContent = prod.title;
      if (modalPrice) modalPrice.textContent = prod.price;
      if (modalDesc) modalDesc.textContent = prod.desc;

      notifyModal.classList.add('active');
    }

    function updateWindow(windowNum, prod) {
      const badge = windowNum === 1 ? badge1 : badge2;
      const imgFront = windowNum === 1 ? imgFront1 : imgFront2;
      const imgBack = windowNum === 1 ? imgBack1 : imgBack2;

      if (badge) badge.textContent = prod.badge;
      if (imgFront) {
        imgFront.src = prod.frontImg;
        imgFront.alt = prod.title;
      }
      if (imgBack) {
        imgBack.src = prod.backImg;
        imgBack.alt = prod.title + ' Back';
      }
    }

    function changeProducts(direction) {
      if (isTransitioning) return;
      isTransitioning = true;
      playCartoonPop(460);

      if (direction === 'next') {
        currentIndex = (currentIndex + 1) % products.length;
      } else {
        currentIndex = (currentIndex - 1 + products.length) % products.length;
      }

      const prod1 = products[currentIndex];
      const prod2 = products[(currentIndex + 1) % products.length];

      // In-place crossfade pop (NOT sliding)
      if (flipper1) flipper1.classList.add('s3-tshirt-swapping');
      if (flipper2) flipper2.classList.add('s3-tshirt-swapping');

      setTimeout(() => {
        updateWindow(1, prod1);
        updateWindow(2, prod2);

        setTimeout(() => {
          if (flipper1) flipper1.classList.remove('s3-tshirt-swapping');
          if (flipper2) flipper2.classList.remove('s3-tshirt-swapping');
          isTransitioning = false;
        }, 50);
      }, 200);
    }

    if (prevBtn) {
      prevBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        e.preventDefault();
        changeProducts('prev');
      });
    }

    if (nextBtn) {
      nextBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        e.preventDefault();
        changeProducts('next');
      });
    }

    // Clicking on window opens modal with currently displayed product
    window1.addEventListener('click', (e) => {
      if (e.target.closest('#s3ShopPrev') || e.target.closest('#s3ShopNext')) return;
      const activeProd = products[currentIndex];
      openProductModal(activeProd);
    });

    window2.addEventListener('click', (e) => {
      if (e.target.closest('#s3ShopPrev') || e.target.closest('#s3ShopNext')) return;
      const activeProd = products[(currentIndex + 1) % products.length];
      openProductModal(activeProd);
    });

    window1.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        const activeProd = products[currentIndex];
        openProductModal(activeProd);
      }
    });

    window2.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        const activeProd = products[(currentIndex + 1) % products.length];
        openProductModal(activeProd);
      }
    });
  }

  // DOM READY INITIALIZATION
  document.addEventListener('DOMContentLoaded', function () {
    initParallax();
    initSection3Parallax();
    initThreeJsBookViewer('book3dContainer', 'assets/models/Ooga_Booga_Hardcover_Render.glb');
    initShopfrontCarousel();
    initPlushieInteraction();
    initVideoCinema();
    initCartAndVariants();
    initNotifyModal();
  });

})();
