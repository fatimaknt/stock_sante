<?php
require_once __DIR__ . '/_config.php';

$mysqli = db();
$uri = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
$base = rtrim(dirname($_SERVER['SCRIPT_NAME']), '/');
$path = '/' . ltrim(str_replace($base, '', $uri), '/');
$method = $_SERVER['REQUEST_METHOD'];
if ($method === 'POST' && isset($_GET['_method'])) { $method = strtoupper($_GET['_method']); }

switch (true) {
	case $path === '/products' && $method === 'GET':
		$q = $mysqli->query("SELECT id, name, category, quantity, price, critical_level, status FROM products ORDER BY id DESC");
		$data = [];
		while ($row = $q->fetch_assoc()) { $data[] = $row; }
		ok(['items' => $data]);
		break;

	case $path === '/products' && $method === 'POST':
		$body = json_body();
		$name = $body['name'] ?? null;
		if (!$name) fail('VALIDATION', 'name is required');
		$category = $body['category'] ?? 'Non catégorisé';
		$quantity = intval($body['quantity'] ?? 0);
		$price = floatval($body['price'] ?? 0);
		$critical = intval($body['critical_level'] ?? 10);
		$stmt = $mysqli->prepare("INSERT INTO products(name, category, quantity, price, critical_level) VALUES(?,?,?,?,?)");
		$stmt->bind_param('ssidi', $name, $category, $quantity, $price, $critical);
		if (!$stmt->execute()) fail('DB_ERROR', $stmt->error, 500);
		ok(['id' => $stmt->insert_id], 201);
		break;

	case $path === '/products' && $method === 'PUT':
		$id = intval($_GET['id'] ?? 0);
		if ($id <= 0) fail('VALIDATION', 'id is required');
		$body = json_body();
		$name = $body['name'] ?? null;
		$category = $body['category'] ?? null;
		$quantity = isset($body['quantity']) ? intval($body['quantity']) : null;
		$price = isset($body['price']) ? floatval($body['price']) : null;
		$critical = isset($body['critical_level']) ? intval($body['critical_level']) : null;
		$fields = [];$types='';$values=[];
		if ($name!==null){$fields[]='name=?';$types.='s';$values[]=$name;}
		if ($category!==null){$fields[]='category=?';$types.='s';$values[]=$category;}
		if ($quantity!==null){$fields[]='quantity=?';$types.='i';$values[]=$quantity;}
		if ($price!==null){$fields[]='price=?';$types.='d';$values[]=$price;}
		if ($critical!==null){$fields[]='critical_level=?';$types.='i';$values[]=$critical;}
		if (!$fields) fail('VALIDATION', 'no fields to update');
		$sql = 'UPDATE products SET ' . implode(',', $fields) . ' WHERE id=?';
		$types.='i';$values[]=$id;
		$stmt = $mysqli->prepare($sql);
		$stmt->bind_param($types, ...$values);
		if (!$stmt->execute()) fail('DB_ERROR', $stmt->error, 500);
		ok(['updated' => $stmt->affected_rows>=0]);
		break;

	case $path === '/products' && $method === 'DELETE':
		$id = intval($_GET['id'] ?? 0);
		if ($id <= 0) fail('VALIDATION', 'id is required');
		$stmt = $mysqli->prepare('DELETE FROM products WHERE id=?');
		$stmt->bind_param('i', $id);
		if (!$stmt->execute()) fail('DB_ERROR', $stmt->error, 500);
		ok(['deleted' => $stmt->affected_rows>0]);
		break;

	default:
		fail('NOT_FOUND', 'Endpoint not found', 404);
}
