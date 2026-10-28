# Small web server image
FROM nginx:1.27-alpine

# Our Nginx settings
COPY nginx.conf /etc/nginx/conf.d/default.conf

# The website files
COPY index.html styles.css app.js config.js /usr/share/nginx/html/

EXPOSE 80