FILES := data/images/icon/bell-off.svg \
	data/images/icon/bell-outline.svg \
	data/images/icon/refresh.svg \
	data/images/logo/dinbendon-alpha-grayscale.png \
	data/images/logo/dinbendon-alpha.png \
	data/images/logo/dinbendon-alpha-2x.png \
	data/images/logo/dinbendon-alpha-4x.png \
	data/images/logo/dinbendon-alpha-8x.png \
	data/images/logo/dinbendon.png \
	data/panel.html \
	data/panel.js \
	lib/dinbendon-parser.js \
	lib/main.js \
	manifest.json \
	README.md

dinbendon-reminder.zip: $(FILES) Makefile
	rm -f dinbendon-reminder.zip
	zip dinbendon-reminder.zip $(FILES)
