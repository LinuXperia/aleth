marked.setOptions({
  breaks: true,
  headerIds: false,
});

import * as controller from './controller.js';
controller.ready.then(showCard);

function now() {
  return Math.floor(Date.now() / 1000);
}

// sync

import * as gauth from './gauth.js';
gauth.execOnSignIn((auth) => {
  fetch('sync', {
    method: 'POST',
    body: JSON.stringify(auth),
  });
});

// refresh cards at least every hour
var timeout;
function refresh() {
  clearTimeout(timeout);
  timeout = setTimeout(() => {
    showCard();
  }, 60 * 60 * 1000);
}

var channel = new BroadcastChannel('sync');
async function showCard(card_id, old_card) {
  refresh();
  let cards = await (await fetch('cards.json')).json();
  let t = now();
  if (card_id &&
      cards[card_id] &&
      cards[card_id].d < t &&
      !cards[card_id].to_delete &&
      cards[card_id].e === old_card.e) {
    return;
  }
  let due = [];
  for (let id in cards) {
    if (id === 's') {
      continue;
    }
    if (cards[id].d <= t && !cards[id].to_delete) {
      due.push(id);
    }
  }
  let main = document.getElementById('main');
  let placeholder = document.getElementById('placeholder');
  let edit = document.getElementById('edit');
  let delete_ = document.getElementById('delete');
  if (due.length === 0) {
    main.style.display = 'none';
    placeholder.style.display = 'block';
    edit.style.display = 'none';
    delete_.style.display = 'none';
    channel.onmessage = (msg) => {
      if (msg.data === 'change') {
        showCard();
      }
    };
    return;
  }
  let id = due[Math.floor(Math.random() * due.length)];
  let card = await (await fetch('card/' + id)).json();
  document.getElementById('question').innerHTML = marked(card.q);
  document.getElementById('answer').innerHTML = marked(card.a);
  let back = document.getElementById('back');
  back.style.visibility = 'hidden';
  main.onclick = () => {
    document.getElementById('time').value = now();
    back.style.visibility = 'visible';
    main.style.cursor = 'auto';
  };
  main.style.cursor = 'pointer';
  document.getElementById('id').value = id;
  placeholder.style.display = 'none';
  main.style.display = 'block';
  edit.onclick = () => {
    location.href =
      'edit.html?id=' + id +
      '&question=' + encodeURIComponent(card.q) +
      '&answer=' + encodeURIComponent(card.a);
  };
  edit.style.display = 'block';
  delete_.onclick = async () => {
    if (window.confirm('La carte va être supprimée.')) {
      await fetch('card/' + id, {method: 'DELETE'});
      gauth.exec((auth) => {
        fetch('sync', {
          method: 'POST',
          body: JSON.stringify(auth),
        });
      });
    }
  };
  delete_.style.display = 'block';
  MathJax.Hub.Queue(["Typeset", MathJax.Hub]);
  channel.onmessage = (msg) => {
    if (msg.data === 'change') {
      showCard(id, cards[id]);
    }
  };
}
