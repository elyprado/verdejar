var map;
var uriFoto;
var marker;
var marcadores = [];
var arvores;

/*jshint browser:true */
/*global $ */(function()
{
 "use strict";
 /*
   hook up event handlers 
 */
 function register_event_handlers()
 {
     
    map = googleMaps.getObjectBySelector('#mapa');
    $(window).resize(function(){
        $('#mapa').css("height",$(window).height()-170);
        $('#mapa').css("width",$(window).width());
   });
   $(window).trigger('resize');
     inicializaMapa();
     buscarArvores();

   
    
        /* button  #btnFotografar */
    $(document).on("click", "#btnFotografar", function(evt)
    {
        /* your code goes here */ 
         pegarFoto(navigator.camera.PictureSourceType.CAMERA);
        //pegarFoto(navigator.camera.PictureSourceType.SAVEDPHOTOALBUM);    
         return false;
    });
    
        /* button  #btnMapa */
    $(document).on("click", "#btnMapa", function(evt)
    {
         /*global activate_subpage */
         activate_subpage("#pagMapa"); 
         buscarArvores();
         return false;
    });
    
        /* button  #btnGaleria */
    $(document).on("click", "#btnGaleria", function(evt)
    {
         /*global activate_subpage */
         buscarFotos();
         activate_subpage("#pagGaleria"); 
         return false;
    });
    
        /* button  #btnSobre */
    $(document).on("click", "#btnSobre", function(evt)
    {
         /*global activate_subpage */
         activate_subpage("#pagSobre"); 
         return false;
    });
    
        /* button  #btnNovaArvore */
    $(document).on("click", "#btnNovaArvore", function(evt)
    {
         /* Other options: .modal("show")  .modal("hide")  .modal("toggle")
         See full API here: http://getbootstrap.com/javascript/#modals 
            */
        
         uriFoto = "";
         $("#dialogNovaArvore").modal("toggle");  
         $("#btnFotografar").html('<i class="glyphicon glyphicon-camera" data-position="icon only"></i>');
         return false;
    });
    
        /* button  #btnCancelarArvore */
    $(document).on("click", "#btnCancelarArvore", function(evt)
    {
         /* Other options: .modal("show")  .modal("hide")  .modal("toggle")
         See full API here: http://getbootstrap.com/javascript/#modals 
            */
        
         $("#dialogNovaArvore").modal("toggle");  
         return false;
    }); 
    
        /* button  #btnEnviarArvore */
    $(document).on("click", "#btnEnviarArvore", function(evt)
    {
         /* Other options: .modal("show")  .modal("hide")  .modal("toggle")
         See full API here: http://getbootstrap.com/javascript/#modals 
            */
        
        
          if (uriFoto=="") {
              toast("Foto é obrigatória!");
              return;
          } 
        
          $("#dialogNovaArvore").modal("hide");  
          enviarArvore();
         
         
        
         return false;
    });
    
    }
 document.addEventListener("app.Ready", register_event_handlers, false);
})();







function pegarFoto(source) {
     /* your code goes here */ 
    var onSuccess = function(imageURI){
        $("#btnFotografar").html("<img src='" + imageURI + "' alt='' height='100px'/>");
        uriFoto = imageURI;
        //document.getElementById('foto').src = imageURI;
    };
    var onFail = function(){ 
        toast("Falha ao tirar foto!"); 
    };
    navigator.camera.getPicture(onSuccess, onFail, { 
quality: 50, destinationType: navigator.camera.DestinationType.FILE_URI, sourceType: source });



}


function buscarArvores() {
    
    jQuery.ajax({
    url: 'http://certificados.fatecfranca.edu.br/verdejar/getArvores.php',
    type: 'POST',
    dataType: "json",
    success: function (data, status) {
        arvores = data;
        //remove todos os marcadores
        for (var i in marcadores) {
            marcadores[i].setMap(null);
        }
        
        marcadores = [];
        for (var i in data) {
            marcadores.push(adicionarMarcador(data[i].latitude, data[i].longitude, i, "","images/treeiconmap.png"));
        }
    }, 
    error: function (jqXHR) {
        toast("Falha ao buscar dados! Verifique sua conexão com a internet!");
        console.log(jqXHR.responseText);
    },
    beforeSend: function (jqXHR) { 
         $("#dialogAguardar").modal("show"); 
    },
    complete: function (jqXHR) {
         $("#dialogAguardar").modal("hide");   
    }
    });  

    //$("#dialogAguardar").modal("hide");  
} 



function enviarArvore() {
    

    
    var parametros = {latitude: marker.getPosition().lat(), longitude: marker.getPosition().lng(), descricao : "", especie: $("#cmbEspecie").val(), foto: ""};
    
        
    jQuery.ajax({
    url: 'http://certificados.fatecfranca.edu.br/verdejar/setArvores.php',
    type: 'POST',
    data: parametros,
    dataType: "json",
    success: function (data, status) {
        if (data.resp!="ok") {
            toast("Falha ao armazenar dados!");
            console.log(data);
        } else {
            upload(data.rowid);    
        }
    }, 
    error: function (jqXHR) {
        toast("Falha ao enviar dados! Verifique sua conexão com a internet!");
        console.log(jqXHR.responseText);
    },
    beforeSend: function (jqXHR) {
         $("#dialogAguardar").modal("show"); 
    },
    complete: function (jqXHR) {
    }
    });  

} 

function upload(rowid) {
    var win = function(r){
        $("#dialogAguardar").modal("hide");  
        toast("Foto enviada com sucesso!");
        buscarArvores();
    };
    var fail = function(error){ 
        toast("Falha ao enviar foto! Verifique sua conexão com a internet!");
        $("#dialogAguardar").modal("hide");  
    };
    var uri = encodeURI("http://certificados.fatecfranca.edu.br/verdejar/upload.php?rowid=" + rowid);
    var fileURL = uriFoto;
    var options = new FileUploadOptions();
    options.fileKey="file";
    options.fileName=fileURL.substr(fileURL.lastIndexOf('/')+1);
    options.mimeType="text/plain";
    var headers={'headerParam':'headerValue'};
    options.headers = headers;
    var ft = new FileTransfer();
    ft.upload(fileURL, uri, win, fail, options);

}


function toast(texto) {
    $("#txtAlerta").html(texto); 
    $("#dialogAlerta").modal("show"); 
    setTimeout(function() {
        $("#dialogAlerta").modal("hide"); 
    }, 3000);
    
}


function adicionarMarcador(lat, lon, titulo, texto, icone) {
    var posicao = new google.maps.LatLng(lat, lon);
    map = googleMaps.getObjectBySelector('#mapa');    
    //cria um novo marcador
    var marcador = new google.maps.Marker({
            position: posicao,
            map: map,
            title: titulo,
            label: texto,
            icon: icone
    });
    //adiciona evento ao clicar no marcador
    marcador.addListener('click', function() {
        //alert("Você clicou no marcador! " + titulo);
        if (titulo!="") {
            abrirFoto(titulo);
        }
    });
    return marcador;
}

function inicializaMapa() {
     var onSuccess = function(p){
      map = googleMaps.getObjectBySelector('#mapa');    
      var lat = p.coords.latitude;
      var lon = p.coords.longitude;
      var posicao = new google.maps.LatLng(lat, lon);
      if (marker==undefined) {
           //caso ainda não exista, cria o marcador
           marker =adicionarMarcador(lat, lon, '', '', '');
           map.setCenter(marker.getPosition()); //centraliza o mapa no local atual
           map.setZoom(14);
      } else {
           marker.setPosition(posicao); //altera a posição do marcador
      }
      
    };
    var onError = function(){ 
        alert("geolocation falhou"); 
    };
    navigator.geolocation.watchPosition(onSuccess, onError, { enableHighAccuracy: true });  
        

}



function buscarFotos() {
    
    $("#gridGaleria").html("");
    
    var largura = ($(window).width()/3) - 4;
    var galeria = "";
    for (var i in arvores) {
        if (((i+1)%3)==1) {
            if (i>0) {
                galeria += "</div>";    
            }
            galeria += "<div class='uib-grid-row'>";
        }
        
        galeria += "<div class='uib-grid-cell'><a href='javascript:abrirFoto("+i+")'> <img width='" + largura  + "' height='auto' src='http://certificados.fatecfranca.edu.br/verdejar/"+arvores[i].foto+"'/></a> </div>";
        
    }
    galeria += "</div>";
    
    $("#gridGaleria").html(galeria);
    
    
}

function abrirFoto(index) {
    $("#lblDescricaoArvore").html(arvores[index].especie);
    $("#imgFotoArvore").attr("src","http://certificados.fatecfranca.edu.br/verdejar/"+arvores[index].foto);
    activate_subpage("#pagArvore");  
}