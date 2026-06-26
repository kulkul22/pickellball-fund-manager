const base = 'http://127.0.0.1:3000';

async function run() {
  try {
    console.log('1) GET /api/users');
    let res = await fetch(`${base}/api/users`);
    let body = await res.json();
    console.log(res.status, body.length ? `users=${body.length}` : JSON.stringify(body));

    const unique = `tester${Date.now()}`;
    const unique2 = `tester${Date.now() + 1}`;

    console.log('2) POST /api/users create user1');
    res = await fetch(`${base}/api/users`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: unique, name: `User ${unique}`, zaloNickname: 'zn', role: 'USER' }),
    });
    const user1 = await res.json();
    console.log(res.status, user1);

    console.log('3) POST /api/users create user2');
    res = await fetch(`${base}/api/users`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: unique2, name: `User ${unique2}`, zaloNickname: 'zn2', role: 'USER' }),
    });
    const user2 = await res.json();
    console.log(res.status, user2);

    console.log('4) POST /api/auth');
    res = await fetch(`${base}/api/auth`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: unique }),
    });
    console.log(res.status, await res.json());

    console.log('5) POST /api/sessions create session');
    res = await fetch(`${base}/api/sessions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        date: new Date().toISOString(),
        location: 'Test place',
        totalCost: 200,
        payerId: user1.id,
        participantIds: [user1.id, user2.id],
      }),
    });
    const session = await res.json();
    console.log(res.status, session);

    console.log('6) GET /api/sessions');
    res = await fetch(`${base}/api/sessions`);
    body = await res.json();
    console.log(res.status, body.length ? `sessions=${body.length}` : JSON.stringify(body));

    console.log('7) POST /api/settlements compute');
    res = await fetch(`${base}/api/settlements`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
    const settlements = await res.json();
    console.log(res.status, settlements);

    if (settlements.settlements?.length) {
      const sid = settlements.settlements[0].id;
      console.log('8) PATCH /api/settlements/' + sid + ' SEND');
      res = await fetch(`${base}/api/settlements/${sid}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'SEND', userRole: 'USER' }),
      });
      console.log(res.status, await res.json());

      console.log('9) PATCH /api/settlements/' + sid + ' RECEIVE');
      res = await fetch(`${base}/api/settlements/${sid}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'RECEIVE', userRole: 'USER' }),
      });
      console.log(res.status, await res.json());
    }

    console.log('10) GET /api/settlements?userId=' + user1.id);
    res = await fetch(`${base}/api/settlements?userId=${user1.id}`);
    console.log(res.status, await res.json());

    console.log('11) POST /api/users/' + user1.id);
    res = await fetch(`${base}/api/users/${user1.id}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: unique }),
    });
    console.log(res.status, await res.json());

    if (user1.id) {
      console.log('12) PUT /api/users/' + user1.id);
      res = await fetch(`${base}/api/users/${user1.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: `Updated ${unique}`, balance: 10 }),
      });
      console.log(res.status, await res.json());

      console.log('13) DELETE /api/users/' + user2.id);
      res = await fetch(`${base}/api/users/${user2.id}`, { method: 'DELETE' });
      console.log(res.status, await res.json());
    }
  } catch (error) {
    console.error('Test failed', error);
  }
}

run();
