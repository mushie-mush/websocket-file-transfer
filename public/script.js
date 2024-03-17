document.addEventListener("DOMContentLoaded", () => {
  let myId;
  let peerId;
  let timeout;
  let fileShare = {};
  const socket = io();

  const joinScreen = document.querySelector(".join-screen");
  const connectionDetailSection = document.querySelector(".connection-detail");
  const joinConnectionSection = document.querySelector(".join-connection");
  const createConnectionButton = document.querySelector("#create-connection");
  const joinConnectionButton = document.querySelector("#join-connection");
  const changeConnectionButton = document.querySelector("#change-connection");
  const connectionId = document.querySelector("#connection-id");
  const otherConnectionId = document.querySelector("#other-connection");
  const qrContainer = document.querySelector("#qrcode");

  const fileTransferScreen = document.querySelector(".fs-screen");
  const uploadFileButton = document.querySelector("#file-input");
  const itemList = document.querySelector(".item-list");

  function generateID() {
    return `${Math.trunc(Math.random() * 999)}-${Math.trunc(
      Math.random() * 999
    )}-${Math.trunc(Math.random() * 999)}`;
  }

  createConnectionButton.addEventListener("click", function () {
    connectionDetailSection.classList.remove("hidden");
    joinConnectionSection.classList.add("hidden");

    let joinID = generateID();

    connectionId.innerHTML = joinID;

    const urlReceiver = window.location.origin + "/?id=" + joinID;

    qrContainer.innerHTML = "";
    const qrcode = new QRCode("qrcode", {
      text: urlReceiver,
      width: 200,
      height: 200,
      colorDark: "#000000",
      colorLight: "#ffffff",
      correctLevel: QRCode.CorrectLevel.H,
    });

    socket.emit("sender-join", {
      uid: joinID,
    });
  });

  changeConnectionButton.addEventListener("click", () => {
    connectionDetailSection.classList.add("hidden");
    joinConnectionSection.classList.remove("hidden");
  });

  joinConnectionButton.addEventListener("click", function () {
    peerId = otherConnectionId.value;

    if (peerId.length == 0) {
      return;
    }

    let joinID = generateID();

    socket.emit("receiver-join", {
      uid: joinID,
      sender_uid: peerId,
    });

    console.log("peerId", peerId);
    console.log("myId", joinID);

    document.querySelector(".join-screen").classList.remove("active");
    document.querySelector(".fs-screen").classList.add("active");

    connectionTimeout();
  });

  uploadFileButton.addEventListener("change", function (e) {
    let file = e.target.files[0];
    if (!file) {
      return;
    }
    let reader = new FileReader();

    reader.onload = function (e) {
      let buffer = new Uint8Array(reader.result);

      const el = createItemElement(file.name);
      itemList.appendChild(el);

      shareFile(
        {
          filename: file.name,
          total_buffer_size: buffer.length,
          buffer_size: 102400,
        },
        buffer,
        el.querySelector(".progress-bar__value")
      );
    };
    reader.readAsArrayBuffer(file);
  });

  function createItemElement(filename) {
    const item = document.createElement("div");
    item.classList.add("item");
    item.innerHTML = `
    <h4 class="item-title">${filename}</h4>
    <div class="progress-bar">
      <div class="progress-bar__value"></div>
    </div>
    `;

    return item;
  }

  function shareFile(metadata, buffer, progress_node) {
    socket.emit("file-meta", {
      uid: peerId,
      metadata: metadata,
    });

    socket.on("fs-share-start", function () {
      let chunk = buffer.slice(0, metadata.buffer_size);

      buffer = buffer.slice(metadata.buffer_size, buffer.length);

      progress_node.style.width =
        Math.trunc(
          ((metadata.total_buffer_size - buffer.length) /
            metadata.total_buffer_size) *
            100
        ) + "%";

      if (buffer.length == 0) {
        progress_node.style.backgroundColor = "#34b568";
      }

      if (chunk.length != 0) {
        socket.emit("file-raw", {
          uid: peerId,
          buffer: chunk,
        });
      }

      connectionTimeout();
    });
  }

  socket.on("init", function (uid) {
    peerId = uid;

    console.log("peerId", peerId);
    console.log("myId", myId);

    joinScreen.classList.remove("active");
    fileTransferScreen.classList.add("active");

    connectionTimeout();
  });

  socket.on("fs-meta", function (metadata) {
    fileShare.metadata = metadata;
    fileShare.transmitted = 0;
    fileShare.buffer = [];

    const el = createItemElement(metadata.filename);
    itemList.appendChild(el);

    fileShare.progress_node = el.querySelector(".progress-bar__value");

    socket.emit("fs-start", {
      uid: peerId,
    });

    connectionTimeout();
  });

  socket.on("fs-share", function (buffer) {
    fileShare.buffer.push(buffer);
    fileShare.transmitted += buffer.byteLength;
    fileShare.progress_node.style.width =
      Math.trunc(
        (fileShare.transmitted / fileShare.metadata.total_buffer_size) * 100
      ) + "%";

    if (fileShare.transmitted == fileShare.metadata.total_buffer_size) {
      fileShare.progress_node.style.backgroundColor = "#34b568";
      download(new Blob(fileShare.buffer), fileShare.metadata.filename);
      fileShare = {};
    } else {
      socket.emit("fs-start", {
        uid: peerId,
      });
    }

    connectionTimeout();
  });

  function connectionTimeout() {
    clearTimeout(timeout);
    timeout = setTimeout(() => {
      location.href = location.origin;
    }, 60000);
  }

  const receiverUrl = window.location.search;
  const urlParams = new URLSearchParams(receiverUrl);
  const paramsConnectionId = urlParams.get("id");

  if (paramsConnectionId) {
    otherConnectionId.value = paramsConnectionId;
    joinConnectionButton.click();
  }
});
