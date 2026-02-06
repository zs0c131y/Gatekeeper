FROM nginx:alpine

COPY DockerFiles/Prod/ConfigFile/server.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
