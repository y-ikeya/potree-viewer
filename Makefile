.PHONY: build run all clean

IMAGE_NAME := las2contour
INPUT_FILE := grid.las
OUTPUT_FILE := contour.geojson

build:
	docker build -t $(IMAGE_NAME) .

run:
	docker run --rm -v $(CURDIR):/work $(IMAGE_NAME) $(INPUT_FILE) $(OUTPUT_FILE)

# `make`または`make all`でビルドと実行を連続して行う
gen: build run

# `make clean`で生成されたファイルを削除
clean:
	rm -f $(OUTPUT_FILE)
