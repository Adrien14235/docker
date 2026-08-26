# Image de production pour le jeu ClickFast
FROM nginxinc/nginx-unprivileged:1.27-alpine
WORKDIR /usr/share/nginx/html
COPY --chown=nginx:nginx index.html style.css script.js ./
EXPOSE 8080
USER nginx
CMD ["nginx", "-g", "daemon off;"]
