var domain = "REMOVED";

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
                    console.log("Caught error: " + e.message);
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
    loadCrossDomain(domain + sessionStorage.video_href, function(data) {
        data = data.query.results.body.div.div[3].div[1].div.div[3].input.value;
        $("#video").append(data);
        $('#video').trigger('create');
    });
});

function loadCrossDomain(url, callback) {
    $.mobile.loading('show');
    var yql = 'http://query.yahooapis.com/v1/public/yql?q=' + encodeURIComponent('select * from html where url="' + url + '"') + '&format=json';
    console.log(yql);
    $.getJSON(yql, function(data) {
        $.mobile.loading('hide');
        console.log(data);
        callback(data);
    });
}

function getCategories(callback) {
    loadCrossDomain(domain, function(data) {
        var categories = data.query.results.body.div.div[4].ul.li;
        callback(categories);
    });
}

function addThumbnail(thumbnail) {
    var video_href = thumbnail.div.div.a.href;
    var src = thumbnail.div.div.a.img.src;
    var title = thumbnail.div.p[0].a.content;
    var duration = thumbnail.div.p[1].span.span.content;
    var id = thumbnail.id;
    $('#thumbnails_list').append('<li><a href="#" id="' + id + '"><img src="' + src + '"><h2>' + title + '</h2><p>' + duration + '</p></a></li>');
    $("#" + id).on("click", function(event) {
        event.preventDefault();
        sessionStorage.video_href = video_href;
        $.mobile.changePage('#video');
    });
}

function getThumbnails(href, callback) {
    loadCrossDomain(domain + href, function(data) {
        try {
            var thumbnails = data.query.results.body.div.div[3].div[2].div.div;
            callback(thumbnails);
        }
        catch (e) {
            console.log("Caught error: " + e.message);
            alert("No results found.");
        }
    });
}

function getSearchThumbnails(href, callback) {
    loadCrossDomain(domain + href, function(data) {
        try {
            var thumbnails = data.query.results.body.div.div[3].div[3].div.div;
            callback(thumbnails);
        }
        catch (e) {
            console.log("Caught error: " + e.message);
            alert("No results found.");
        }
    });
}
