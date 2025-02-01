# Felifoodie-Backend 🍴

```API Desplegada:``` [https://felifoodiebackend-1.onrender.com](https://felifoodiebackend-1.onrender.com)  
```Documentación Swagger:``` [https://felifoodiebackend-1.onrender.com/docs](https://felifoodiebackend-1.onrender.com/docs)

## Descripción
Backend para un sistema de recomendación de restaurantes construido con ```NestJS```. Ofrece funcionalidades clave como:  
- 🛠️ Autenticación segura mediante JWT.  
- 🔍 Búsqueda inteligente de restaurantes usando APIs externas.  
- 📚 Historial de búsquedas persistente y accesible.  
- 🚀 Arquitectura modular siguiendo prácticas de código limpio y escalable.

---

## Características Principales

### 🔐 Autenticación de Usuarios
- Registro e inicio de sesión con validación de datos.  
- Protección de endpoints mediante tokens JWT.

### 🍽️ Gestión de Restaurantes
- Búsqueda por nombre, ciudad o categoría.  
- Listado de restaurantes destacados.  
- Integración con APIs de geolocalización (simulada o real).

### 📅 Historial de Búsquedas
- Almacenamiento automático de búsquedas realizadas.  
- Consulta paginada del historial del usuario.

---

## Endpoints Clave

### Autenticación
| Método | Endpoint           | Descripción                     |
|--------|--------------------|---------------------------------|
| POST   | '/v1/user/register'| Registra un nuevo usuario.      |
| POST   | '/v1/user/login'   | Genera un token JWT para acceso.|

```Ejemplo de Registro:```
```
// POST /v1/user/register
{
  "email": "usuario@ejemplo.com",
  "password": "contraseñaSegura123",
  "name": "Juan Pérez"
}
```

```Respuesta Exitosa (201):```
```
{
  "data": {
    "id": "uuid-example",
    "email": "usuario@ejemplo.com",
    "name": "Juan Pérez"
  },
  "message": "Usuario creado exitosamente"
}
```

---

### Búsqueda de Restaurantes
| Método | Endpoint                       | Descripción                                  |
|--------|--------------------------------|---------------------------------------------|
| GET    | '/v1/places/search-restaurant'| Busca restaurantes por término (nombre, ciudad, etc.). |
| GET    | '/v1/places/top-restaurants'  | Retorna los restaurantes mejor valorados.   |

```Ejemplo de Búsqueda:```
```
GET /v1/places/search-restaurant?search=sushi
```

```Respuesta Exitosa (200):```
```
{
  "data": [
    {
      "name": "Sushi Bar",
      "address": "Calle Principal 123",
      "rating": 4.8,
      "category": "Japonés"
    }
  ]
}
```

---

## Configuración ⚙️

### Variables de Entorno
Crea un archivo '.env' en la raíz con:
```
JWT_SECRET=todo-list
API_GOOGLE=<API KEY DE GOOGLE>
KEY_MONGO=<API KEY DE MONGO>
```

### Instalación
1. Clona el repositorio:
   ```
   git clone https://github.com/JoseFeliciano-spec/FeliFoodieBackend.git
   ```
2. Instala dependencias:
   ```
   npm install
   ```
3. Inicia el servidor:
   ```
   npm run start:dev  # Modo desarrollo
   ```

---

## Tecnologías Utilizadas
- ```Backend:``` NestJS, MongoDB, JWT, Swagger.  
- ```Calidad de Código:``` ESLint, Prettier.  

---

✉️ ```Contacto:``` [janayasimanca@gmail.com](mailto:janayasimanca@gmail.com)  
🔗 ```Frontend:``` [Repositorio](https://github.com/JoseFeliciano-spec/FeliFoodieFrontend) | [Demo](https://feli-foodie-frontend.vercel.app)  
📜 ```Licencia:``` MIT
