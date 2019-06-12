class BulwarkClient {
  constructor() {
    this.settings = {};

    return {
      settings: this.settings,
      init: this.init.bind(this),
      connect: this.connect.bind(this),
      disconnect: this.disconnect.bind(this),
      createRoom: this.createRoom.bind(this),
      joinRoom: this.joinRoom.bind(this),
      leaveRoom: this.leaveRoom.bind(this),
      addClient: this.addClient.bind(this),

      startGame: this.startGame.bind(this),
      signin: this.signin.bind(this),
      refreshClients: this.refreshClients.bind(this),
      refreshRooms: this.refreshRooms.bind(this),
      sendChatMessage: this.sendChatMessage.bind(this),
      listen: this.listen.bind(this)
    }
  }

  init(canvas_holder, bRender, bGame, bInput, bClient, bUI, bPubSub) {
    this.settings.holder  = canvas_holder;
    this.settings.bRender = bRender;
    this.settings.bGame   = bGame;
    this.settings.bInput  = bInput;
    this.settings.bClient = bClient;
    this.settings.bUI     = bUI;
    this.settings.bPubSub = bPubSub;

    // Connect to server
    if (typeof io !== "undefined") {
      this.connect();
    } else {
      bUI.createModal('offline');
    }
  }

  connect() {
    console.log("Initializing socket");
    this.settings.socket = io('https://murtada.nl/projects/bulwark/socket', { 'force new connection': true });
    this.settings.clients = [];
    this.settings.clients_ids = {};
    this.settings.enemies = [];
    this.settings.enemies_ids = {};
    this.settings.current_client = null;

    this.settings.bPubSub.publish("bClient-ready");
  }

  disconnect() {
    console.log("Disconnecting socket");
    if (this.settings.socket) {
      console.log(this.settings.socket);
    }
  }

  signin(data) {
    console.log("Attempting signin with client:", data.nickname);
    this.settings.socket.emit('client-signin', data);
  }

  listen() {
    // Listen to the following...
    this.settings.socket.on('connect', (data) => {
      console.log("Connected to server");

      if (!this.settings.current_player) {
        // this.settings.bUI.playSound('intro');
        this.settings.bUI.createModal('signin');
      }
    });

    this.settings.socket.on('new-chat-message', (data) => {
      this.settings.bPubSub.publish("new-chat-message", data);
    });

    this.settings.socket.on('clients-list', (data) => {
      this.settings.clients_list = data;
      this.settings.bPubSub.publish("refresh-clients-done", data);
    });

    this.settings.socket.on('client-signin', (data) => {
      this.handleClientSignin(data);
    });

    this.settings.socket.on('client-signoff', (data) => {
      console.log(data);
      this.handleClientSignoff(data);
    });

    this.settings.socket.on('self-signin', (data) => {
      const callback = this.handleSelfSignin.bind(this);
      callback(data);
    });

    this.settings.socket.on('client-click', (data) => {
      this.settings.bGame.addShot(data, bRender);
    });

    this.settings.socket.on('client-join', (data) => {
      const callback = this.handleClientJoin.bind(this);
      callback(data);
    });

    this.settings.socket.on('client-leave', (data) => {
      const callback = this.handleClientLeave.bind(this);
      callback(data);
    });

    this.settings.socket.on('client-update', (data) => {
      const callback = this.handleClientUpdate.bind(this);
      callback(data);
    });

    this.settings.socket.on('self-spawn', (data) => {
      const callback = this.handleSelfSpawn.bind(this);
      callback(data);
    });

    this.settings.socket.on('self-despawn', (data) => {
      const callback = this.handleSelfDeSpawn.bind(this);
      callback(data);
    });

    this.settings.socket.on('client-spawn', (data) => {
      const callback = this.handleClientSpawn.bind(this);
      callback(data);
    });

    this.settings.socket.on('client-despawn', (data) => {
      const callback = this.handleClientDeSpawn.bind(this);
      callback(data);
    });

    //Rooms
    this.settings.socket.on('rooms-list', (data) => {
      this.settings.rooms_list = data;
      this.settings.bPubSub.publish("refresh-rooms-done", data);
    });

    this.settings.socket.on('join-room-done', (data) => {
      const callback = this.handleJoinRoomDone.bind(this);
      callback(data);
    });

    this.settings.socket.on('create-room-done', (data) => {
      const callback = this.handleCreateRoomDone.bind(this);
      callback(data);
    });

    this.settings.socket.on('create-room-self', (data) => {
      this.settings.bPubSub.publish("create-room-self", data);
    });

    this.settings.socket.on('leave-room-done', (data) => {
      this.settings.bPubSub.publish("leave-room-done", data);
    });

    this.settings.socket.on('room-snapshot', (data) => {
      const callback = this.handleRoomSnapshot.bind(this);
      callback(data);
    });

    //Game
    this.settings.socket.on('start-game', () => {
      this.settings.bPubSub.publish("start-game");
    });

    this.settings.socket.on('enemy-spawn', (data) => {
      const callback = this.handleEnemySpawn.bind(this);
      callback(data);

      this.settings.bPubSub.publish("enemy-spawn");
    });

    this.settings.socket.on('enemy-update', (data) => {
      const callback = this.handleEnemyUpdate.bind(this);
      callback(data);

      this.settings.bPubSub.publish("enemy-update");
    });

    this.settings.socket.on('wave-update', (data) => {
      const callback = this.handleWaveUpdate.bind(this);
      callback(data);

      this.settings.bPubSub.publish("wave-update");
    });
  }

  refreshClients() {
    this.settings.socket.emit('clients-list');
    console.log("Refreshing clients");
  }

  refreshRooms() {
    this.settings.socket.emit('rooms-list');
    console.log("Refreshing rooms");
  }

  handleClientJoin(data) {
    data.message = `${data.nickname} joined the room`;
    this.settings.bUI.addChatMessage(data, 'server-message');
  }

  handleClientLeave(data) {
    data.message = `${data.nickname} left the room`;
    this.settings.bUI.addChatMessage(data, 'server-message');
  }

  handleSelfSpawn(data) {
    const client_sprite = bRender.createPlayerSprite(data, bRender, true);
    this.addClient(data, client_sprite, true);
  }

  handleSelfDeSpawn(data) {
    data.message = `You left the game`;
    this.settings.bUI.addChatMessage(data, 'server-message-self');
  }

  handleClientSpawn(data) {
    const client_sprite = bRender.createPlayerSprite(data, bRender);
    this.addClient(data, client_sprite);
  }

  handleClientDeSpawn(data) {
    data.message = `${data.nickname} left the game`;
    this.settings.bUI.addChatMessage(data, 'server-message');
  }

  handleClientSignin(data) {
    data.message = `${data.nickname} logged in`;
    this.settings.bUI.addChatMessage(data, 'server-message');
  }

  handleClientSignoff(data) {
    data.message = `${data.nickname} logged out`;
    this.settings.bUI.addChatMessage(data, 'server-message');
  }

  handleEnemySpawn(data) {
    this.addEnemy(data);
  }

  handleEnemyUpdate(data) {
    const currentEnemy = this.settings.enemies_ids[data.enemy.id];
    currentEnemy.life = data.enemy.life;

    if (!currentEnemy.checkAlive(data.hit)) {
      return;
    }

    currentEnemy.sprite.position.x = data.enemy.position.x;
    currentEnemy.sprite.position.y = data.enemy.position.y;
  }

  handleWaveUpdate(data) {
    this.settings.bUI.playSound('new-wave');
  }

  sendChatMessage(data) {
    data.nickname = this.settings.current_client.nickname;

    console.log("Sending chat message with:", data.nickname, data.message);

    this.settings.socket.emit('chat-message', data);
  }

  handleSelfSignin(data) {
    console.log("Signed in!");
    this.settings.current_client = data;

    this.settings.bUI.showLobby();

    data.message = `You joined the room "${this.settings.current_client.location}"`;
    this.settings.bUI.addChatMessage(data, 'server-message-self');
  }

  handleClientUpdate(data) {
    if (this.settings.clients_ids[data.id]) {
      const client = this.settings.clients_ids[data.id];

      client.rotation = data.rotation;
      client.x = data.x;
      client.y = data.y;
    }
  }

  addClient(data = null, client_sprite, is_self) {
    if (data) {
      data.sprite = client_sprite;

      this.settings.clients.push(data);
      this.settings.clients_ids[data.id] = data;

      console.log(data);

      if (is_self) {
        this.settings.current_client = data;
        console.log(`You have joined with id: ${data.id}`);
      }
    }
  }

  addEnemy(data = null) {
    if (data) {
      data.sprite = bRender.createEnemySprite(data, bRender, true);
      data.sprite.velocity = data.velocity;

      data.sprite.animate = function() {
        this.position.y += this.velocity.y;
        this.position.x += this.velocity.x;
        this.rotation += this.velocity.angular;
      };

      data.bUI = this.settings.bUI;

      data.explode = function(hit) {
        const sfx = this.bUI.playSound('impact');
        this.bUI.sounds['impact'].rate(1 + (Math.random() - Math.random()) * .1, sfx);

        const spatialPos = {
          x: (this.position.x - (bRender.settings.stage_width * .5)) / (bRender.settings.stage_width * .5),
          y: (this.position.y - (bRender.settings.stage_height * .5)) / (bRender.settings.stage_height * .5)
        };

        this.bUI.sounds['impact'].pos(spatialPos.x, spatialPos.y, 0, sfx);

        // Explosion sparks
        for (let i = 0; i < 10; i++) {
          const spark = new PIXI.Sprite.from(bRender.sprites[`asteroid2`].texture);
          spark.position.x = this.sprite.position.x + (Math.random() - Math.random()) * 20;
          spark.position.y = this.sprite.position.y + (Math.random() - Math.random()) * 20;
          spark.anchor.x = .5;
          spark.anchor.y = .5;
          spark.scale.y = spark.scale.x = Math.random() * .4 + .1;
          spark.ttl = 30;
          spark.visible = true;

          const velocityMultiplier = 5;

          let angle = 1;

          if (hit) {
            const dm_point = {
              dx: spark.position.x - hit.x,
              dy: spark.position.y - hit.y
            };

            angle = Math.atan2(dm_point.dy, dm_point.dx);

            spark.velocity = {
              x: velocityMultiplier * Math.cos(angle) * ((Math.random() * .5) + .5),
              y: velocityMultiplier * Math.sin(angle) * ((Math.random() * .5) + .5),
              r: (Math.random() - Math.random()) * .2
            };
          } else {
            console.log('asd');
            spark.velocity = {
              x: velocityMultiplier * (Math.random() - Math.random()),
              y: velocityMultiplier * (Math.random() - Math.random()),
              r: (Math.random() - Math.random()) * .2
            };
          }

          spark.animate = function() {
            this.position.x += this.velocity.x;
            this.position.y += this.velocity.y;
            this.rotation += this.velocity.r;
            this.scale.x = this.scale.y *= .95;

            this.velocity.x *= .95;
            this.velocity.y *= .95;

            if (this.position.y > 330) {
              this.position.y = 330;
              this.velocity.y *= -1;
            }
          }

          bRender.settings.particles.addChild(spark);
        }
      }

      data.checkAlive = function(data) {
        if (this.life < 1) {
          let enemyIndex = null;

          bClient.settings.enemies.find((enemy, index) => {
            if (enemy.id == this.id) {
              enemyIndex = index;
            }
          });

          this.explode(data);

          bClient.settings.enemies_ids[this.id].sprite.destroy();

          bClient.settings.enemies.splice(enemyIndex, 1);

          delete bClient.settings.enemies_ids[this.id];

          return false;
        }

        return true;
      }

      this.settings.enemies.push(data);
      this.settings.enemies_ids[data.id] = data;
    }
  }

  //Rooms
  createRoom(data) {
    this.settings.socket.emit('create-room', data);
  }

  joinRoom(data) {
    this.settings.socket.emit('join-room', data);
  }

  leaveRoom() {
    this.settings.socket.emit('leave-room');
  }

  handleCreateRoomDone(data) {
    this.settings.bPubSub.publish("create-room-done", data);
    console.log(data);
  }

  handleJoinRoomDone(data) {
    this.settings.bPubSub.publish("join-room-done", data);
  }

  handleRoomSnapshot(data) {
    data.enemies.forEach(syncEnemy => {
      if (!this.settings.enemies_ids[syncEnemy.id]) {
        return;
      }

      const currentEnemy = this.settings.enemies_ids[syncEnemy.id];

      currentEnemy.life = syncEnemy.life;

      let hit = null;

      if (syncEnemy.position.y > 329) {
        hit = {
          x: syncEnemy.position.x,
          y: syncEnemy.position.y + 5 + (syncEnemy.velocity.y * 5)
        };
      }

      if (!currentEnemy.checkAlive(hit)) {
        return;
      }

      currentEnemy.sprite.position.x = syncEnemy.position.x;
      currentEnemy.sprite.position.y = syncEnemy.position.y;
    });
  }

  //Game
  startGame() {
    console.log('>>> Requesting start-game');
    this.settings.socket.emit('start-game');
  }
}
