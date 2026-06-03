"use client"

import { useState } from 'react'
import { motion } from 'framer-motion'
import { Header } from '@/components/layout/header'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import {
  Code,
  Copy,
  Check,
  ExternalLink,
  Zap,
  Shield,
  Palette,
  MessageSquare
} from 'lucide-react'

export default function IntegrationPage() {
  const [copiedCode, setCopiedCode] = useState<string | null>(null)

  const copyToClipboard = (code: string, id: string) => {
    navigator.clipboard.writeText(code)
    setCopiedCode(id)
    setTimeout(() => setCopiedCode(null), 2000)
  }

  const baseUrl = typeof window !== 'undefined' 
    ? window.location.origin 
    : 'https://your-domain.vercel.app'

  const codeExamples = {
    simple: `<!-- Простое встраивание через iframe -->
<iframe 
  src="${baseUrl}/embed?module=all&theme=light"
  width="100%"
  height="600"
  frameborder="0"
  allow="camera; microphone"
  style="border-radius: 8px;"
></iframe>`,

    sdk: `<!-- 1. Подключите SDK -->
<script src="${baseUrl}/sdk/skillverify.js"></script>

<!-- 2. Создайте контейнер -->
<div id="skillverify-widget"></div>

<!-- 3. Инициализируйте виджет -->
<script>
  SkillVerify.init({
    container: '#skillverify-widget',
    module: 'skillproof',  // 'skillproof' | 'challengegate' | 'all'
    theme: 'light',        // 'light' | 'dark'
    companyName: 'Работа.ру',
    height: '700px',
    onComplete: function(result) {
      console.log('Тест завершен:', result);
      // result.score - балл (0-100)
      // result.passed - пройден ли тест
    },
    onReady: function(instance) {
      console.log('Виджет готов');
    }
  });
</script>`,

    dataAttr: `<!-- Автоматическая инициализация через data-атрибуты -->
<script src="${baseUrl}/sdk/skillverify.js"></script>

<div 
  data-skillverify
  data-module="skillproof"
  data-theme="light"
  data-company="Работа.ру"
  data-height="700px"
></div>`,

    modal: `<!-- Открытие в модальном окне -->
<script src="${baseUrl}/sdk/skillverify.js"></script>

<button onclick="openSkillVerify()">
  Пройти верификацию
</button>

<script>
  function openSkillVerify() {
    SkillVerify.openModal({
      module: 'skillproof',
      theme: 'light',
      onComplete: function(result) {
        alert('Результат: ' + result.score + '%');
      }
    });
  }
</script>`,

    events: `// Доступные события

SkillVerify.init({
  container: '#widget',
  
  // Виджет загружен и готов
  onReady: function(instance) {
    console.log('Ready');
  },
  
  // Тест/челлендж завершен
  onComplete: function(result) {
    // result.score - балл
    // result.passed - пройден ли
    // result.certificateId - ID сертификата (если выдан)
  },
  
  // Смена этапа тестирования
  onStageChange: function(data) {
    // data.stage - текущий этап
  },
  
  // Тест прерван из-за нарушений
  onTerminated: function(data) {
    // data.reason - причина
  },
  
  // Навигация внутри виджета
  onNavigate: function(data) {
    // data.path - новый путь
  },
  
  // Ошибка
  onError: function(error) {
    console.error(error);
  }
});`,

    api: `// Программное управление виджетом

const widget = SkillVerify.init({
  container: '#widget',
  module: 'all'
});

// Навигация
widget.navigate('/embed/skillproof');

// Смена темы
widget.setTheme('dark');

// Уничтожение виджета
widget.destroy();

// Уничтожить все виджеты на странице
SkillVerify.destroyAll();`
  }

  const CodeBlock = ({ code, id }: { code: string; id: string }) => (
    <div className="relative">
      <pre className="bg-muted/50 rounded-lg p-4 overflow-x-auto text-sm">
        <code>{code}</code>
      </pre>
      <Button
        size="sm"
        variant="ghost"
        className="absolute top-2 right-2"
        onClick={() => copyToClipboard(code, id)}
      >
        {copiedCode === id ? (
          <Check className="h-4 w-4 text-green-500" />
        ) : (
          <Copy className="h-4 w-4" />
        )}
      </Button>
    </div>
  )

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container mx-auto px-4 py-8 max-w-5xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-8"
        >
          {/* Hero */}
          <div className="text-center space-y-4">
            <Badge className="mb-2">Документация</Badge>
            <h1 className="text-3xl md:text-4xl font-bold">
              Интеграция SkillVerify
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Встройте модуль верификации навыков на ваш сайт за несколько минут
            </p>
          </div>

          {/* Quick Start */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="h-5 w-5 text-primary" />
                Быстрый старт
              </CardTitle>
              <CardDescription>
                Самый простой способ добавить виджет на страницу
              </CardDescription>
            </CardHeader>
            <CardContent>
              <CodeBlock code={codeExamples.simple} id="simple" />
            </CardContent>
          </Card>

          {/* SDK Documentation */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Code className="h-5 w-5 text-primary" />
                JavaScript SDK
              </CardTitle>
              <CardDescription>
                Полный контроль над виджетом через JavaScript API
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="basic" className="w-full">
                <TabsList className="grid w-full grid-cols-4 mb-4">
                  <TabsTrigger value="basic">Базовое</TabsTrigger>
                  <TabsTrigger value="data-attr">Data-атрибуты</TabsTrigger>
                  <TabsTrigger value="modal">Модальное окно</TabsTrigger>
                  <TabsTrigger value="events">События</TabsTrigger>
                </TabsList>

                <TabsContent value="basic">
                  <CodeBlock code={codeExamples.sdk} id="sdk" />
                </TabsContent>

                <TabsContent value="data-attr">
                  <CodeBlock code={codeExamples.dataAttr} id="dataAttr" />
                </TabsContent>

                <TabsContent value="modal">
                  <CodeBlock code={codeExamples.modal} id="modal" />
                </TabsContent>

                <TabsContent value="events">
                  <CodeBlock code={codeExamples.events} id="events" />
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>

          {/* Configuration */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Palette className="h-5 w-5 text-primary" />
                Параметры конфигурации
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-2 px-4 font-medium">Параметр</th>
                      <th className="text-left py-2 px-4 font-medium">Тип</th>
                      <th className="text-left py-2 px-4 font-medium">По умолчанию</th>
                      <th className="text-left py-2 px-4 font-medium">Описание</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b">
                      <td className="py-2 px-4"><code>container</code></td>
                      <td className="py-2 px-4">string | Element</td>
                      <td className="py-2 px-4">-</td>
                      <td className="py-2 px-4">CSS селектор или DOM элемент</td>
                    </tr>
                    <tr className="border-b">
                      <td className="py-2 px-4"><code>module</code></td>
                      <td className="py-2 px-4">string</td>
                      <td className="py-2 px-4">{`'all'`}</td>
                      <td className="py-2 px-4">{`'skillproof' | 'challengegate' | 'all'`}</td>
                    </tr>
                    <tr className="border-b">
                      <td className="py-2 px-4"><code>theme</code></td>
                      <td className="py-2 px-4">string</td>
                      <td className="py-2 px-4">{`'light'`}</td>
                      <td className="py-2 px-4">{`'light' | 'dark'`}</td>
                    </tr>
                    <tr className="border-b">
                      <td className="py-2 px-4"><code>companyName</code></td>
                      <td className="py-2 px-4">string</td>
                      <td className="py-2 px-4">{`''`}</td>
                      <td className="py-2 px-4">Название компании</td>
                    </tr>
                    <tr className="border-b">
                      <td className="py-2 px-4"><code>primaryColor</code></td>
                      <td className="py-2 px-4">string</td>
                      <td className="py-2 px-4">-</td>
                      <td className="py-2 px-4">Основной цвет (CSS)</td>
                    </tr>
                    <tr className="border-b">
                      <td className="py-2 px-4"><code>width</code></td>
                      <td className="py-2 px-4">string</td>
                      <td className="py-2 px-4">{`'100%'`}</td>
                      <td className="py-2 px-4">Ширина виджета</td>
                    </tr>
                    <tr className="border-b">
                      <td className="py-2 px-4"><code>height</code></td>
                      <td className="py-2 px-4">string</td>
                      <td className="py-2 px-4">{`'600px'`}</td>
                      <td className="py-2 px-4">Высота виджета</td>
                    </tr>
                    <tr>
                      <td className="py-2 px-4"><code>hideTitle</code></td>
                      <td className="py-2 px-4">boolean</td>
                      <td className="py-2 px-4">false</td>
                      <td className="py-2 px-4">Скрыть заголовок</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* URL Parameters */}
          <Card>
            <CardHeader>
              <CardTitle>URL параметры для iframe</CardTitle>
              <CardDescription>
                Параметры можно передавать напрямую в URL iframe
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-sm">
                <p><code className="bg-muted px-1 rounded">?module=skillproof</code> - Только SkillProof</p>
                <p><code className="bg-muted px-1 rounded">?module=challengegate</code> - Только ChallengeGate</p>
                <p><code className="bg-muted px-1 rounded">?theme=dark</code> - Тёмная тема</p>
                <p><code className="bg-muted px-1 rounded">?companyName=Работа.ру</code> - Название компании</p>
                <p><code className="bg-muted px-1 rounded">?hideTitle=true</code> - Скрыть заголовок</p>
              </div>
            </CardContent>
          </Card>

          {/* PostMessage Events */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5 text-primary" />
                PostMessage API
              </CardTitle>
              <CardDescription>
                События, которые виджет отправляет родительскому окну
              </CardDescription>
            </CardHeader>
            <CardContent>
              <CodeBlock code={`// Слушайте события от виджета
window.addEventListener('message', function(event) {
  if (!event.data.type?.startsWith('skillverify:')) return;
  
  switch(event.data.type) {
    case 'skillverify:ready':
      // Виджет загружен
      break;
    case 'skillverify:completed':
      // Тест завершен
      // event.data.data.score - балл
      // event.data.data.passed - успешно ли
      break;
    case 'skillverify:terminated':
      // Тест прерван
      break;
    case 'skillverify:stageChange':
      // Смена этапа
      break;
  }
});`} id="postmessage" />
            </CardContent>
          </Card>

          {/* Security Notice */}
          <Card className="border-primary/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-primary" />
                Безопасность
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <p>
                Виджет использует современные механизмы безопасности:
              </p>
              <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                <li>Content Security Policy для защиты от XSS</li>
                <li>X-Frame-Options настроен для разрешённых доменов</li>
                <li>CORS headers для API запросов</li>
                <li>Все данные передаются по HTTPS</li>
                <li>Видео с камеры не записывается и не передаётся на сервер</li>
              </ul>
              <p className="text-muted-foreground">
                Для добавления вашего домена в список разрешённых, свяжитесь с нами.
              </p>
            </CardContent>
          </Card>

          {/* Demo */}
          <Card>
            <CardHeader>
              <CardTitle>Демо</CardTitle>
              <CardDescription>
                Попробуйте виджет прямо сейчас
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-3">
                <Button asChild>
                  <a href="/embed" target="_blank">
                    Открыть embed версию
                    <ExternalLink className="ml-2 h-4 w-4" />
                  </a>
                </Button>
                <Button variant="outline" asChild>
                  <a href="/embed/skillproof" target="_blank">
                    SkillProof
                    <ExternalLink className="ml-2 h-4 w-4" />
                  </a>
                </Button>
                <Button variant="outline" asChild>
                  <a href="/embed/challenges" target="_blank">
                    ChallengeGate
                    <ExternalLink className="ml-2 h-4 w-4" />
                  </a>
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </main>
    </div>
  )
}
