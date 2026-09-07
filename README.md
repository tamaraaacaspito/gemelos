# 👯‍♀️ Gemelos

**Dos outfits. Una misión. 🤫**

Mini aplicación web para organizar una dinámica grupal donde los participantes son emparejados aleatoriamente y deben coordinar un outfit para vestirse como gemelos.

## Stack

- **Frontend**: React 18 + TypeScript + Vite + Tailwind CSS
- **Backend**: Supabase (PostgreSQL + Auth + RPC Functions)
- **Deploy**: Vercel
- **Animaciones**: Framer Motion
- **Notificaciones**: react-hot-toast

---

## Requisitos previos

- [Node.js](https://nodejs.org/) v18+
- Una cuenta en [Supabase](https://supabase.com/) (gratuita)
- Una cuenta en [Vercel](https://vercel.com/) (gratuita, para deploy)

---

## 1. Configurar Supabase

### 1.1 Crear proyecto

1. Ve a [app.supabase.com](https://app.supabase.com/) y crea un nuevo proyecto.
2. Anota la **URL del proyecto** y la **anon key** (Settings → API).

### 1.2 Crear tablas y funciones

1. En el dashboard de Supabase, ve a **SQL Editor → New Query**.
2. Copia y pega **todo** el contenido de [`supabase/migrations/001_initial_schema.sql`](supabase/migrations/001_initial_schema.sql).
3. Ejecuta el query. Esto crea:
   - Tabla `app_settings` (configuración del evento)
   - Tabla `participants` (participantes y sus parejas)
   - Políticas RLS (seguridad a nivel de fila)
   - Funciones RPC (registro, sorteo, revelación)

### 1.3 Crear usuario administrador

1. En el dashboard de Supabase, ve a **Authentication → Users → Add User**.
2. Crea un usuario con:
   - **Email**: el email del organizador (ej: `admin@gemelos.app`)
   - **Password**: una contraseña segura
   - **Auto Confirm User**: ✅ activado
3. Este será el único usuario que podrá acceder al panel de administrador en `/admin`.

---

## 2. Configurar el proyecto local

### 2.1 Clonar e instalar

```bash
git clone <tu-repo-url>
cd gemelos
npm install
```

### 2.2 Variables de entorno

Copia el archivo de ejemplo y agrega tus credenciales:

```bash
cp .env.example .env
```

Edita `.env`:

```env
VITE_SUPABASE_URL=https://tu-proyecto.supabase.co
VITE_SUPABASE_ANON_KEY=tu-anon-key-aqui
```

> ⚠️ **Nunca** subas el archivo `.env` a GitHub. Ya está en `.gitignore`.

### 2.3 Ejecutar localmente

```bash
npm run dev
```

La app estará disponible en `http://localhost:5173`.

---

## 3. Uso de la aplicación

### Flujo completo

1. **Landing** (`/`): Los participantes ven la información del evento.
2. **Registro** (`/participar`): Cada participante ingresa su nombre y recibe un código secreto único (ej: `GEM-4821`).
3. **Admin** (`/admin`): El organizador cierra el registro y ejecuta el sorteo.
4. **Descubrir** (`/descubrir`): Cada participante ingresa su código secreto para descubrir quién es su gemelo.
5. **WhatsApp**: Los participantes pueden compartir un mensaje para coordinar su outfit.

### Panel de administrador

Accede a `/admin` con el email y contraseña del usuario creado en Supabase Auth.

Desde allí puedes:
- Ver la lista de participantes y sus códigos
- Abrir/cerrar el registro
- Cambiar la fecha del evento
- Ejecutar el sorteo (requiere número par de participantes)
- Ver las parejas generadas
- Reiniciar el sorteo si es necesario

---

## 4. Deploy en Vercel

### 4.1 Subir a GitHub

```bash
git init
git add .
git commit -m "Initial commit: Gemelos app"
git remote add origin <tu-repo-url>
git push -u origin main
```

### 4.2 Conectar con Vercel

1. Ve a [vercel.com](https://vercel.com/) e importa tu repositorio de GitHub.
2. Configura las **Environment Variables**:
   - `VITE_SUPABASE_URL` → tu URL de Supabase
   - `VITE_SUPABASE_ANON_KEY` → tu anon key
3. Deploy. Vercel detectará automáticamente que es un proyecto Vite.

### 4.3 Build de producción (manual)

```bash
npm run build
```

Los archivos estáticos se generan en la carpeta `dist/`.

---

## 5. Seguridad

### Row Level Security (RLS)

- La tabla `app_settings` es de solo lectura para usuarios públicos.
- La tabla `participants` **no es accesible directamente** por usuarios anónimos.
- Todas las operaciones públicas (registro, revelación) pasan por funciones RPC con `SECURITY DEFINER`.
- Las funciones admin verifican `auth.uid()` antes de ejecutar.
- El sorteo usa `pg_advisory_xact_lock` para evitar ejecuciones simultáneas.

### Lo que un participante NO puede hacer

- ❌ Ver la lista completa de parejas
- ❌ Consultar la pareja de otra persona
- ❌ Ver los códigos secretos de otros
- ❌ Acceder a funciones administrativas
- ❌ Modificar datos directamente en la base de datos

---

## 6. Estructura del proyecto

```
src/
├── components/
│   ├── ui/          → Button, Card, Input, Badge, Modal, Loading
│   ├── layout/      → Layout, Header
│   └── StatusBadge  → Indicador de estado del registro
├── pages/
│   ├── HomePage     → Landing con hero y CTA
│   ├── RegisterPage → Formulario de registro
│   ├── RevealPage   → Descubrir gemelo con animación
│   └── AdminPage    → Panel del organizador
├── services/
│   └── supabase     → Cliente y funciones API
├── hooks/
│   ├── useAppSettings → Estado de la app
│   └── useAuth        → Autenticación admin
├── utils/
│   ├── draw           → Algoritmo de emparejamiento
│   └── whatsapp       → Generador de URL WhatsApp
├── config/
│   └── event          → Configuración centralizada del evento
├── types/             → Interfaces TypeScript
├── App.tsx            → Router
├── main.tsx           → Entry point
└── index.css          → Estilos globales + Tailwind
```

---

## 7. Datos de prueba

Para probar la aplicación, registra estos nombres de prueba:

- Tamara, Bruno, Ximena, Waldo, Arellys, Yeral

> ⚠️ **Elimina los datos de prueba antes de usar en producción.** Puedes hacerlo desde el SQL Editor de Supabase:
> ```sql
> DELETE FROM participants;
> UPDATE app_settings SET registration_open = true, draw_completed = false WHERE id = 1;
> ```

---

## Licencia

Uso privado para la dinámica grupal "Gemelos".
