FROM node:20-alpine

# Establece el directorio de trabajo
WORKDIR /app

# Copia el archivo package.json y package-lock.json
COPY package*.json ./

# Instala las dependencias
RUN npm install

# Copia el archivo .env
COPY .env .env

# Copia el resto del código de la aplicación
COPY . .

RUN npm run build

# Exponer el puerto en el que la aplicación correrá
EXPOSE 8080

# Comando para correr la aplicación
CMD ["npm", "run", "start"]