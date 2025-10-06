<?php
$contenido = file_get_contents("php://input");
file_put_contents("precios2015.txt", $contenido);
echo "OK";
?>
