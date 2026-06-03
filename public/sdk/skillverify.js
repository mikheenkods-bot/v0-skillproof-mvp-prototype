/**
 * SkillVerify Embed SDK v1.0
 * 
 * Легкое встраивание модуля верификации навыков на любой веб-ресурс
 * 
 * Использование:
 * 
 * 1. Подключите SDK:
 *    <script src="https://your-domain.vercel.app/sdk/skillverify.js"></script>
 * 
 * 2. Инициализируйте виджет:
 *    SkillVerify.init({
 *      container: '#skillverify-widget',
 *      module: 'skillproof', // 'skillproof' | 'challengegate' | 'all'
 *      theme: 'light',       // 'light' | 'dark'
 *      onComplete: (result) => console.log(result)
 *    });
 * 
 * 3. Или используйте простой метод:
 *    SkillVerify.embed('#container');
 */

(function(window, document) {
  'use strict';

  const SDK_VERSION = '1.0.0';
  const DEFAULT_BASE_URL = window.SKILLVERIFY_BASE_URL || 'https://skillverify.vercel.app';

  /**
   * @typedef {Object} SkillVerifyConfig
   * @property {string|HTMLElement} container - CSS селектор или DOM элемент контейнера
   * @property {'skillproof'|'challengegate'|'all'} [module='all'] - Модуль для отображения
   * @property {'light'|'dark'} [theme='light'] - Цветовая тема
   * @property {string} [primaryColor] - Кастомный основной цвет (CSS color)
   * @property {string} [companyName] - Название компании для отображения
   * @property {string} [width='100%'] - Ширина iframe
   * @property {string} [height='600px'] - Высота iframe
   * @property {boolean} [hideTitle=false] - Скрыть заголовок
   * @property {Function} [onReady] - Callback при готовности виджета
   * @property {Function} [onComplete] - Callback при завершении теста/челленджа
   * @property {Function} [onNavigate] - Callback при навигации внутри виджета
   * @property {Function} [onError] - Callback при ошибке
   */

  const SkillVerify = {
    version: SDK_VERSION,
    _instances: [],
    _baseUrl: DEFAULT_BASE_URL,

    /**
     * Устанавливает базовый URL для embed
     * @param {string} url 
     */
    setBaseUrl: function(url) {
      this._baseUrl = url.replace(/\/$/, '');
    },

    /**
     * Инициализирует виджет с полной конфигурацией
     * @param {SkillVerifyConfig} config 
     * @returns {Object} Instance object
     */
    init: function(config) {
      if (!config || !config.container) {
        console.error('[SkillVerify] Container is required');
        return null;
      }

      const container = typeof config.container === 'string' 
        ? document.querySelector(config.container)
        : config.container;

      if (!container) {
        console.error('[SkillVerify] Container not found:', config.container);
        return null;
      }

      // Build URL with params
      const params = new URLSearchParams();
      if (config.module) params.set('module', config.module);
      if (config.theme) params.set('theme', config.theme);
      if (config.primaryColor) params.set('primaryColor', config.primaryColor);
      if (config.companyName) params.set('companyName', config.companyName);
      if (config.hideTitle) params.set('hideTitle', 'true');

      const iframeUrl = `${this._baseUrl}/embed?${params.toString()}`;

      // Create iframe
      const iframe = document.createElement('iframe');
      iframe.src = iframeUrl;
      iframe.style.width = config.width || '100%';
      iframe.style.height = config.height || '600px';
      iframe.style.border = 'none';
      iframe.style.borderRadius = '8px';
      iframe.style.backgroundColor = '#fff';
      iframe.setAttribute('allow', 'camera; microphone');
      iframe.setAttribute('allowfullscreen', 'true');
      iframe.setAttribute('title', 'SkillVerify Widget');

      // Clear container and append iframe
      container.innerHTML = '';
      container.appendChild(iframe);

      // Instance object
      const instance = {
        iframe: iframe,
        container: container,
        config: config,
        destroy: function() {
          container.innerHTML = '';
          const idx = SkillVerify._instances.indexOf(instance);
          if (idx > -1) SkillVerify._instances.splice(idx, 1);
          window.removeEventListener('message', messageHandler);
        },
        navigate: function(path) {
          iframe.contentWindow.postMessage({
            type: 'skillverify:navigate',
            path: path
          }, '*');
        },
        setTheme: function(theme) {
          const url = new URL(iframe.src);
          url.searchParams.set('theme', theme);
          iframe.src = url.toString();
        }
      };

      // Message handler
      const messageHandler = function(event) {
        if (!event.data || !event.data.type) return;
        if (!event.data.type.startsWith('skillverify:')) return;

        const action = event.data.type.replace('skillverify:', '');
        const data = event.data.data;

        switch (action) {
          case 'ready':
            if (config.onReady) config.onReady(instance);
            break;
          case 'completed':
            if (config.onComplete) config.onComplete(data);
            break;
          case 'navigate':
            if (config.onNavigate) config.onNavigate(data);
            break;
          case 'stageChange':
            if (config.onStageChange) config.onStageChange(data);
            break;
          case 'terminated':
            if (config.onTerminated) config.onTerminated(data);
            break;
          case 'error':
            if (config.onError) config.onError(data);
            break;
        }
      };

      window.addEventListener('message', messageHandler);

      this._instances.push(instance);
      return instance;
    },

    /**
     * Простой метод встраивания с минимальной конфигурацией
     * @param {string|HTMLElement} container 
     * @param {Object} [options] 
     * @returns {Object} Instance object
     */
    embed: function(container, options) {
      return this.init({
        container: container,
        ...options
      });
    },

    /**
     * Встраивает только SkillProof модуль
     * @param {string|HTMLElement} container 
     * @param {Object} [options] 
     */
    embedSkillProof: function(container, options) {
      return this.init({
        container: container,
        module: 'skillproof',
        ...options
      });
    },

    /**
     * Встраивает только ChallengeGate модуль
     * @param {string|HTMLElement} container 
     * @param {Object} [options] 
     */
    embedChallengeGate: function(container, options) {
      return this.init({
        container: container,
        module: 'challengegate',
        ...options
      });
    },

    /**
     * Открывает виджет в модальном окне
     * @param {SkillVerifyConfig} config 
     */
    openModal: function(config) {
      // Create modal overlay
      const overlay = document.createElement('div');
      overlay.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.6);
        z-index: 99999;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 20px;
      `;

      // Create modal container
      const modal = document.createElement('div');
      modal.style.cssText = `
        background: white;
        border-radius: 12px;
        width: 100%;
        max-width: 900px;
        max-height: 90vh;
        overflow: hidden;
        position: relative;
      `;

      // Close button
      const closeBtn = document.createElement('button');
      closeBtn.innerHTML = '&times;';
      closeBtn.style.cssText = `
        position: absolute;
        top: 10px;
        right: 15px;
        background: none;
        border: none;
        font-size: 28px;
        cursor: pointer;
        z-index: 10;
        color: #666;
        line-height: 1;
      `;

      modal.appendChild(closeBtn);
      overlay.appendChild(modal);
      document.body.appendChild(overlay);

      // Init widget in modal
      const instance = this.init({
        ...config,
        container: modal,
        width: '100%',
        height: '80vh'
      });

      // Close handlers
      const closeModal = function() {
        if (instance) instance.destroy();
        document.body.removeChild(overlay);
      };

      closeBtn.onclick = closeModal;
      overlay.onclick = function(e) {
        if (e.target === overlay) closeModal();
      };

      // ESC key
      const escHandler = function(e) {
        if (e.key === 'Escape') {
          closeModal();
          document.removeEventListener('keydown', escHandler);
        }
      };
      document.addEventListener('keydown', escHandler);

      return {
        ...instance,
        close: closeModal
      };
    },

    /**
     * Уничтожает все экземпляры виджета
     */
    destroyAll: function() {
      this._instances.forEach(function(instance) {
        instance.destroy();
      });
      this._instances = [];
    }
  };

  // Auto-init from data attributes
  document.addEventListener('DOMContentLoaded', function() {
    const autoInitElements = document.querySelectorAll('[data-skillverify]');
    autoInitElements.forEach(function(el) {
      const config = {
        container: el,
        module: el.dataset.module || 'all',
        theme: el.dataset.theme || 'light',
        companyName: el.dataset.company || '',
        height: el.dataset.height || '600px'
      };
      SkillVerify.init(config);
    });
  });

  // Expose to global scope
  window.SkillVerify = SkillVerify;

})(window, document);
