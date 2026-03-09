# La CartelerIA

La CartelerIA es una aplicación web centrada en la búsqueda, consulta, organización y valoración de películas y series. El proyecto combina información audiovisual obtenida desde TMDB con funcionalidades propias como listas personales, reseñas, votos e integración de inteligencia artificial.

## Funcionalidades principales

- Página principal con obras en tendencia
- Buscador de películas y series
- Fichas detalladas de cada obra
- Gestión de listas personales:
  - Favoritos
  - Watchlist
  - Visto
- Perfil de usuario demo
- Reseñas públicas
- Votación positiva y negativa de reseñas
- Chat contextual con IA sobre cada obra
- Generación de borrador de reseñas con IA

## Tecnologías utilizadas

- Next.js
- TypeScript
- Tailwind CSS
- PostgreSQL
- TMDB API
- OpenAI API
- Git

## Estructura general del proyecto

El proyecto está organizado como una aplicación web con frontend y backend integrados mediante Next.js App Router. Incluye rutas de página, endpoints internos para la lógica del sistema y conexión con una base de datos PostgreSQL para almacenar la información propia de la aplicación.

## Instalación y ejecución


```bash
1. Clonar el repositorio
git clone https://github.com/IvanSupr/la-carteleria.git
cd la-carteleria

2. Instalar dependencias
npm install

3. Configurar variables de entorno
Crear un archivo .env.local en la raíz del proyecto con una estructura similar a esta:

DATABASE_URL=
TMDB_READ_TOKEN=
OPENAI_API_KEY=
NEXT_PUBLIC_BASE_URL=http://localhost:3000

4. Ejecutar en desarrollo
npm run dev

La aplicación quedará disponible normalmente en:
http://localhost:3000

Base de datos

El proyecto utiliza PostgreSQL para almacenar:
obras registradas internamente
estados del usuario sobre cada obra
reseñas
votos de reseñas
Estado del proyecto

Proyecto final desarrollado como trabajo de DAM, con una versión funcional centrada en la experiencia de usuario, la consulta de contenido audiovisual y la integración de inteligencia artificial.

Autor

Ivan Plaza
