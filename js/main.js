var domain = "";

$(document).on('pagecreate', '#menu', function() {
    window.scrollTo(0, 1);

    $.mobile.defaultPageTransition = "slide";
    sessionStorage.clear();
    // Default date range of videos to all.
    sessionStorage.selected_date = "all";

    // Populate menu
    getCategories(function(categories) {
        for (var i = 0; i < categories.length; i++) {
            (function (i) {
                var category = categories[i].a;
                $('#menu_list').append('<li><a href="#" id="category_' + i + '">' + category.content + '</a></li>');
                $("#category_" + i).on("click", function(event) {
                    event.preventDefault();
                    sessionStorage.text = category.content;
                    sessionStorage.href = category.href.substring(3);
                    sessionStorage.page = 0;
                    sessionStorage.isSearch = false;
                    $.mobile.changePage('#thumbnails');
                });
            })(i);
        }
                
        $('#menu_list').listview('refresh');
    });

    // Register search event
    $("#search_form").submit(function(event) {
        event.preventDefault();
        sessionStorage.text = $("#search_field").val();
        sessionStorage.page = 0;
        sessionStorage.isSearch = true;
        $.mobile.changePage('#thumbnails');
    });
    
    // Register date selection event
    $("#select_date").change(function(event) {
        event.preventDefault();
        sessionStorage.selected_date = $("#select_date").val();
        $.mobile.changePage('#thumbnails', {
            transition: "fade",
            allowSamePageTransition: true
        });
    });

    // Increase the horizontal swipe threshold.
    $.event.special.swipe.horizontalDistanceThreshold = 150;

    // Add swipe right event to thumbnails page which returns to last page or menu.
    $('#thumbnails').swiperight(function() {
        sessionStorage.page = parseInt(sessionStorage.page, 10) - 1;
        if (parseInt(sessionStorage.page, 10) < 0) {
            $.mobile.changePage('#menu', {
                reverse: true
            });
        }
        else {
            $.mobile.changePage('#thumbnails', {
                allowSamePageTransition: true,
                reverse: true
            });
        }
    });

    // Add swipe left event to thumbnails page which goes to the next page.
    $('#thumbnails').swipeleft(function() {
        sessionStorage.page = parseInt(sessionStorage.page, 10) + 1;
        $.mobile.changePage('#thumbnails', {
            allowSamePageTransition: true
        });
    });

    //Add swipe right event to video player which returns to thumbnails list.
    $('#video').swiperight(function() {
        console.log("Swipe right on video page, returning to thumbnails")
        $.mobile.changePage('#thumbnails', {
            reverse: true
        });
    });
});

$(document).on("pagebeforeshow", "#thumbnails", function() {
    //Empty list of thumbnails before the transition animation
    $('#thumbnails_list').empty();
    
    //Remove last video iframe before page transition.
    $('#video iframe').remove();
    
    $('#thumbnails_text').text(sessionStorage.text + ' ' + (parseInt(sessionStorage.page, 10) + 1));
});

$(document).on("pageshow", "#thumbnails", function() {
    
    if(sessionStorage.isSearch === "true") {
        var selected_date;
        if(sessionStorage.selected_date == "day") {
            selected_date = "today";
        }
        else {
            selected_date = sessionStorage.selected_date;
        }
        var search_href = '/?k=' + sessionStorage.text.replace(/ /g, "+") + '&p=' + sessionStorage.page + '&datef=' + selected_date;
        console.log(search_href);
    
        getSearchThumbnails(search_href, function(thumbnails) {
            for (var i = 0; i < thumbnails.length; i++) {
                try {
                    addThumbnail(thumbnails[i]);
                }
                catch (e) {
                    console.log("Caught error: " + e.message);
                }
            }
            $('#thumbnails_list').listview('refresh');
        });
    }
    else {
        var selected_date;
        if(sessionStorage.selected_date == "all") {
            selected_date = "";
        }
        else {
            selected_date = sessionStorage.selected_date;
        }
        var category_href = '/c/' + selected_date + '/' + sessionStorage.page + '/' + sessionStorage.href;
        console.log(category_href);
    
        getThumbnails(category_href, function(thumbnails) {
            for (var i = 0; i < thumbnails.length; i++) {
                try {
                    addThumbnail(thumbnails[i]);
                }
                catch (e) {
                    console.log("Caught error: " + e.message + ", thumbnail = " + thumbnails[i]);
                }
            }
            $('#thumbnails_list').listview('refresh');
        });
    }
});

$(document).on("pagebeforeshow", "#video", function() {
    //Remove last video iframe before page transition.
    $('#video iframe').remove();
});

$(document).on("pageshow", "#video", function() {
    loadCrossDomain(domain + sessionStorage.video_href, "#mediaEmbedCodeInput", function(data) {
        //data = JSON.stringify(data);
        //data = data.match(/("<iframe.+?<\/iframe>")/i)[1];
        //data = JSON.parse(data);
        data = data.query.results.results.input.value;
        //TODO: resize iframe
        $("#video").append(data);
        $('#video').trigger('create');
    });
});

function loadCrossDomainDeprecated(url, callback) {
    $.mobile.loading('show');
    var yql = 'https://query.yahooapis.com/v1/public/yql?q=' + encodeURIComponent('select * from html where url="' + url + '"') + '&format=json';
    console.log("loadCrossDomain url = " + yql);
    $.getJSON(yql, function(data) {
        $.mobile.loading('hide');
        console.log("loadCrossDomain data = ", data);
        callback(data);
    });
}

function loadCrossDomain(url, cssselector, callback) {
    $.mobile.loading('show');
    var yql = 'https://query.yahooapis.com/v1/public/yql?q=' + encodeURIComponent('select * from data.html.cssselect where url="' + url + '" and css="' + cssselector + '"') + '&format=json&env=store%3A%2F%2Fdatatables.org%2Falltableswithkeys';
    console.log("loadCrossDomain url = " + yql);
    $.getJSON(yql, function(data) {
        $.mobile.loading('hide');
        console.log("loadCrossDomain data = ", data);
        callback(data);
    });
}

function getCategories(callback) {
    loadCrossDomain(domain, "#categories li", function(data) {
        //data = JSON.stringify(data);
        //data = data.match(/"id"\:"categories","ul"\:\{"li"\:(\[.+?\])/i)[1];
        //data = JSON.parse(data);
        data = data.query.results.results.li;
        callback(data);
    });
}

function addThumbnail(data) {
    data = JSON.stringify(data);
    var video_href = data.match(/"href":"(.+?)"/i)[1];
    var src = data.match(/"src":"(.+?)"/i)[1];
    var title = data.match(/"title":"(.+?)"/i)[1];
    var duration = data.match(/"class":"duration","content":"(.+?)"/i)[1];
    var id = data.match(/"id":"(.+?)"/i)[1];
    $('#thumbnails_list').append('<li><a href="#" id="' + id + '"><img src="' + src + '"><h2>' + title + '</h2><p>' + duration + '</p></a></li>');
    $("#" + id).on("click", function(event) {
        event.preventDefault();
        sessionStorage.video_href = video_href;
        $.mobile.changePage('#video');
    });
}

function getThumbnails(href, callback) {
    loadCrossDomain(domain + href, ".mozaique > div", function(data) {
        try {
            data = data.query.results.results.div;
            //data = JSON.stringify(data);
            //data = data.match(/{"id":"content","div":{"class":"mozaique","div":(\[.+?\])}},{"class":"pagination/i)[1];
            //data = JSON.parse(data);
            callback(data);
        }
        catch (e) {
            console.log("Caught error = ", e, ", data = ", data);
            alert("No results found.");
        }
    });
}

function getSearchThumbnails(href, callback) {
    loadCrossDomain(domain + href, ".mozaique.profilesGalleries.videoThumbs > div", function(data) {
        try {
            data = data.query.results.results.div;
            //data = JSON.stringify(data);
            //data = data.match(/{"id":"content","div":{"class":"mozaique profilesGalleries videoThumbs","id":"profilesList","div":(\[.+?\])}},{"class":"pagination/i)[1];
            //data = JSON.parse(data);
            callback(data);
        }
        catch (e) {
            console.log("Caught error = ", e, ", data = ", data);
            alert("No results found.");
        }
    });
}
